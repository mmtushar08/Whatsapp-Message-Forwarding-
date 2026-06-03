import { maskPhoneNumber } from '@whatsapp-forwarder/shared';
import { Request, Response } from 'express';
import config from '../config';
import {
  getWorkspaceRuntimeByPhoneNumberId,
  getWorkspaceRuntimeByVerifyToken,
  WorkspaceRuntime,
} from '../db/workspaceStore';
import { getRulesForWorkspace } from '../db/rulesStore';
import { logMessage } from '../db/messageStore';
import { appendMessage, clearHistory, getHistory } from '../db/conversationStore';
import { getForwardToNumber, isForwardingEnabled } from './configController';
import { passesFilter, passesFilterForKeywords } from '../services/filterService';
import logger from '../services/loggerService';
import { forwardToMultiple, sendDirectMessage } from '../services/whatsappService';
import { generateReply } from '../services/aiService';
import { sendForwardEmail } from '../services/emailService';
import { relayToWebhook } from '../services/webhookRelayService';
import { getLimits } from '../services/planService';
import { getUserById } from '../db/userStore';
import { getCurrentMonthUsage, incrementUsage } from '../db/usageStore';
import { WebhookPayload } from '../types/whatsapp';
import { extractMessages } from '../utils/messageParser';

async function runSideEffects(
  relayUrl: string,
  emailTo: string,
  msg: { from: string; senderName?: string; text: string; type: string },
  businessLabel: string,
): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  if (relayUrl) {
    tasks.push(
      relayToWebhook(relayUrl, {
        from: msg.from,
        senderName: msg.senderName,
        message: msg.text,
        type: msg.type,
        receivedAt: new Date().toISOString(),
        businessLabel,
      }),
    );
  }
  if (emailTo) {
    tasks.push(
      sendForwardEmail({
        to: emailTo,
        fromNumber: msg.from,
        senderName: msg.senderName,
        messageText: msg.text,
        businessLabel,
      }).catch((e: Error) => logger.warn(`Email forward failed: ${e.message}`)),
    );
  }
  if (tasks.length) await Promise.allSettled(tasks);
}

function resolveWorkspaceForVerification(token: string | undefined): WorkspaceRuntime | null {
  if (!token) return null;
  return getWorkspaceRuntimeByVerifyToken(token);
}

function resolveWorkspaceFromPayload(payload: WebhookPayload): WorkspaceRuntime | null {
  const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  if (!phoneNumberId) {
    return null;
  }

  return getWorkspaceRuntimeByPhoneNumberId(phoneNumberId);
}

export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token =
    typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'] : undefined;
  const challenge = req.query['hub.challenge'];
  const workspace = resolveWorkspaceForVerification(token);
  const expectedToken = workspace?.webhookVerifyToken ?? config.webhookVerifyToken;

  logger.info(`Webhook verification request received. Mode: ${mode}`);

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info(
      workspace
        ? `Webhook verification successful for workspace ${workspace.id}`
        : 'Webhook verification successful',
    );
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed - token mismatch or invalid mode');
    res.sendStatus(403);
  }
}

export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  res.sendStatus(200);

  const payload = req.body as WebhookPayload;

  if (payload.object !== 'whatsapp_business_account') {
    logger.debug(`Ignoring non-WhatsApp webhook object: ${payload.object}`);
    return;
  }

  const workspace = resolveWorkspaceFromPayload(payload);
  const messages = extractMessages(payload);

  if (messages.length === 0) {
    logger.debug('Webhook received but no messages found (possibly a status update)');
    return;
  }

  logger.info(
    workspace
      ? `Processing ${messages.length} message(s) for workspace ${workspace.id}`
      : `Processing ${messages.length} message(s) from webhook`,
  );

  for (const message of messages) {
    const senderLabel = message.senderName
      ? `${message.senderName} (${message.from})`
      : message.from;

    logger.info(
      `Received message from ${senderLabel} | Type: ${message.type} | Text: "${message.text}"`,
    );

    try {
      // ── Legacy (no-workspace) path ────────────────────────────────────────
      if (!workspace) {
        if (!passesFilter(message.text)) {
          logger.info(`Message did not pass keyword filter - skipping.`);
          continue;
        }
        if (!isForwardingEnabled()) {
          logger.info(`Forwarding is disabled - skipping message from ${senderLabel}`);
          continue;
        }
        const legacyRecipients =
          config.forwardToNumbers.length > 0
            ? config.forwardToNumbers
            : [getForwardToNumber() || config.forwardToNumber];
        const legacyResults = await forwardToMultiple(message.from, message.text, legacyRecipients);
        legacyResults.forEach(({ to, success, error }) => {
          logger.info(
            success
              ? `Forwarded to ${maskPhoneNumber(to)}`
              : `Failed to forward to ${maskPhoneNumber(to)}: ${error}`,
          );
          logMessage({
            workspace_id: undefined,
            from_number: message.from,
            to_number: to,
            message: message.text,
            type: message.type,
            status: success ? 'success' : 'failed',
            error,
          });
        });
        continue;
      }

      // ── Workspace path ────────────────────────────────────────────────────
      const creds = { accessToken: workspace.accessToken, phoneNumberId: workspace.phoneNumberId };

      // Additional rules are evaluated independently of the workspace-level keyword
      // filter so that each rule can match a different class of messages.
      for (const rule of getRulesForWorkspace(workspace.id)) {
        if (!rule.forwardingEnabled) continue;
        if (!passesFilterForKeywords(message.text, rule.keywordFilters)) continue;
        if (rule.allowedSenders.length > 0 && !rule.allowedSenders.includes(message.from)) continue;

        const ruleRecipients = [rule.forwardToNumber, ...rule.extraRecipients].filter(Boolean);
        const ruleResults = await forwardToMultiple(
          message.from,
          message.text,
          ruleRecipients,
          creds,
        ).catch((e: Error) =>
          ruleRecipients.map((to) => ({ to, success: false, error: e.message })),
        );
        ruleResults.forEach(({ to, success, error }) => {
          logMessage({
            workspace_id: workspace.id,
            from_number: message.from,
            to_number: to,
            message: message.text,
            type: message.type,
            status: success ? 'success' : 'failed',
            error,
          });
        });
        await runSideEffects(
          rule.webhookRelayUrl,
          rule.emailForwardTo,
          message,
          workspace.businessLabel,
        );
      }

      // Workspace-level keyword filter gates primary forwarding only
      if (!passesFilterForKeywords(message.text, workspace.keywordFilters)) {
        logger.info(`Message did not pass workspace keyword filter - skipping primary forward.`);
        continue;
      }
      if (!workspace.forwardingEnabled) {
        logger.info(`Workspace forwarding disabled - skipping message from ${senderLabel}`);
        continue;
      }

      // Free-tier monthly cap
      const owner = getUserById(workspace.userId);
      const limits = getLimits(owner?.plan ?? 'free');
      if (limits.monthlyMessages !== -1) {
        const used = getCurrentMonthUsage(workspace.id);
        if (used >= limits.monthlyMessages) {
          logger.warn(
            `Workspace ${workspace.id} exceeded monthly cap of ${limits.monthlyMessages}. Skipping.`,
          );
          continue;
        }
      }

      const recipients = [workspace.forwardToNumber, ...workspace.extraRecipients].filter(Boolean);
      const results = await forwardToMultiple(message.from, message.text, recipients, creds);

      results.forEach(({ to, success, error }) => {
        if (success) {
          logger.info(`Forwarded to ${maskPhoneNumber(to)}`);
        } else {
          logger.error(`Failed to forward to ${maskPhoneNumber(to)}: ${error}`);
        }
        logMessage({
          workspace_id: workspace.id,
          from_number: message.from,
          to_number: to,
          message: message.text,
          type: message.type,
          status: success ? 'success' : 'failed',
          error,
        });
      });

      if (results.some((r) => r.success)) incrementUsage(workspace.id);

      await runSideEffects(
        workspace.webhookRelayUrl,
        workspace.emailForwardTo,
        message,
        workspace.businessLabel,
      );

      if (workspace.autoReplyEnabled) {
        if (message.text.trim().toLowerCase() === 'human') {
          clearHistory(workspace.id, message.from);
          await sendDirectMessage(
            message.from,
            '✋ Connecting you to a live agent. Please wait.',
            creds,
          ).catch((e: Error) => logger.warn(`Handoff message failed: ${e.message}`));
          logger.info(`Chatbot handoff triggered by ${maskPhoneNumber(message.from)}`);
        } else {
          const history = getHistory(workspace.id, message.from);
          appendMessage(workspace.id, message.from, 'user', message.text);
          const reply = await generateReply(workspace.autoReplyPrompt, history, message.text).catch(
            () => null,
          );
          if (reply) {
            appendMessage(workspace.id, message.from, 'assistant', reply);
            await sendDirectMessage(message.from, reply, creds).catch((e: Error) =>
              logger.warn(`Chatbot reply send failed: ${e.message}`),
            );
            logger.info(
              `Chatbot replied to ${maskPhoneNumber(message.from)} (${history.length + 1} turns)`,
            );
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to process message from ${senderLabel}: ${(error as Error).message}`);
    }
  }
}
