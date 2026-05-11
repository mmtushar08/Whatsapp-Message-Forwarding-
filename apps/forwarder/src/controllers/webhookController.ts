import { maskPhoneNumber } from '@whatsapp-forwarder/shared';
import { Request, Response } from 'express';
import config from '../config';
import {
  getWorkspaceRuntimeByPhoneNumberId,
  getWorkspaceRuntimeByVerifyToken,
  WorkspaceRuntime,
} from '../db/workspaceStore';
import { logMessage } from '../db/messageStore';
import { getForwardToNumber, isForwardingEnabled } from './configController';
import { passesFilter, passesFilterForKeywords } from '../services/filterService';
import logger from '../services/loggerService';
import { forwardToMultiple } from '../services/whatsappService';
import { sendForwardEmail } from '../services/emailService';
import { relayToWebhook } from '../services/webhookRelayService';
import { getLimits } from '../services/planService';
import { getUserById } from '../db/userStore';
import { getCurrentMonthUsage, incrementUsage } from '../db/usageStore';
import { WebhookPayload } from '../types/whatsapp';
import { extractMessages } from '../utils/messageParser';

function resolveWorkspaceForVerification(token: string | undefined): WorkspaceRuntime | null {
  if (!token) {
    return null;
  }

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

    const passes = workspace
      ? passesFilterForKeywords(message.text, workspace.keywordFilters)
      : passesFilter(message.text);

    if (!passes) {
      logger.info(
        `Message from ${senderLabel} did not pass keyword filter - skipping. Text: "${message.text}"`,
      );
      continue;
    }

    const forwardingEnabled = workspace ? workspace.forwardingEnabled : isForwardingEnabled();
    if (!forwardingEnabled) {
      logger.info(`Forwarding is disabled - skipping message from ${senderLabel}`);
      continue;
    }

    // Free-tier monthly cap enforcement
    if (workspace) {
      const owner = getUserById(workspace.userId);
      const limits = getLimits(owner?.plan ?? 'free');
      if (limits.monthlyMessages !== -1) {
        const used = getCurrentMonthUsage(workspace.id);
        if (used >= limits.monthlyMessages) {
          logger.warn(
            `Workspace ${workspace.id} (plan: ${owner?.plan ?? 'free'}) exceeded monthly cap of ${limits.monthlyMessages}. Skipping message.`,
          );
          continue;
        }
      }
    }

    try {
      const recipients = workspace
        ? [workspace.forwardToNumber, ...workspace.extraRecipients].filter(Boolean)
        : config.forwardToNumbers.length > 0
          ? config.forwardToNumbers
          : [getForwardToNumber() || config.forwardToNumber];

      const results = await forwardToMultiple(
        message.from,
        message.text,
        recipients,
        workspace
          ? {
              accessToken: workspace.accessToken,
              phoneNumberId: workspace.phoneNumberId,
            }
          : undefined,
      );

      results.forEach(({ to, success, error }) => {
        if (success) {
          logger.info(`Forwarded to ${maskPhoneNumber(to)}`);
        } else {
          logger.error(`Failed to forward to ${maskPhoneNumber(to)}: ${error}`);
        }

        logMessage({
          workspace_id: workspace?.id,
          from_number: message.from,
          to_number: to,
          message: message.text,
          type: message.type,
          status: success ? 'success' : 'failed',
          error,
        });
      });

      // Count one usage event per inbound message (not per recipient) — simpler mental model for users.
      if (workspace && results.some((r) => r.success)) {
        incrementUsage(workspace.id);
      }

      if (workspace) {
        const sideEffects: Promise<unknown>[] = [];

        if (workspace.webhookRelayUrl) {
          sideEffects.push(
            relayToWebhook(workspace.webhookRelayUrl, {
              from: message.from,
              senderName: message.senderName,
              message: message.text,
              type: message.type,
              receivedAt: new Date().toISOString(),
              businessLabel: workspace.businessLabel,
            }),
          );
        }

        if (workspace.emailForwardTo) {
          sideEffects.push(
            sendForwardEmail({
              to: workspace.emailForwardTo,
              fromNumber: message.from,
              senderName: message.senderName,
              messageText: message.text,
              businessLabel: workspace.businessLabel,
            }).catch((err: Error) =>
              logger.warn(`Email forward to ${workspace.emailForwardTo} failed: ${err.message}`),
            ),
          );
        }

        if (sideEffects.length > 0) {
          await Promise.allSettled(sideEffects);
        }
      }
    } catch (error) {
      logger.error(`Failed to forward message from ${senderLabel}: ${(error as Error).message}`);
    }
  }
}
