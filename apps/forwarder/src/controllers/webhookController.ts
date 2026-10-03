import { maskPhoneNumber } from '@whatsapp-forwarder/shared';
import { Request, Response } from 'express';
import config from '../config';
import { insertConversationMessage } from '../db/conversationStore';
import { logMessage, MessageChannel } from '../db/messageStore';
import { getCurrentMonthUsage, incrementUsage } from '../db/usageStore';
import { getUserById } from '../db/userStore';
import { claimWebhookMessage } from '../db/webhookEventStore';
import {
  getWorkspaceRuntimeByPhoneNumberId,
  getWorkspaceRuntimeByVerifyToken,
  markWebhookActivity,
  WorkspaceRuntime,
} from '../db/workspaceStore';
import { sendForwardEmail } from '../services/emailService';
import { passesFilter, passesFilterForKeywords } from '../services/filterService';
import logger from '../services/loggerService';
import { getLimits } from '../services/planService';
import { relayToWebhook } from '../services/webhookRelayService';
import { forwardToMultiple } from '../services/whatsappService';
import { ParsedMessage, WebhookChange, WebhookPayload } from '../types/whatsapp';
import { extractMessagesFromValue } from '../utils/messageParser';
import { getForwardToNumber, isForwardingEnabled } from './configController';

interface Delivery {
  channel: MessageChannel;
  to: string;
  success: boolean;
  error?: string;
}

export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token =
    typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'] : undefined;
  const challenge = req.query['hub.challenge'];
  const workspace = token ? getWorkspaceRuntimeByVerifyToken(token) : null;
  const expectedToken = workspace?.webhookVerifyToken ?? config.webhookVerifyToken;

  logger.info(`Webhook verification request received. Mode: ${mode}`);

  if (mode === 'subscribe' && token === expectedToken) {
    if (workspace) {
      markWebhookActivity(workspace.id);
      logger.info(`Webhook verification successful for workspace ${workspace.id}`);
    } else {
      logger.info('Webhook verification successful');
    }
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed - token mismatch or invalid mode');
    res.sendStatus(403);
  }
}

export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  // Acknowledge first: Meta retries anything slower than a few seconds.
  res.sendStatus(200);

  const payload = req.body as WebhookPayload;

  if (payload.object !== 'whatsapp_business_account') {
    logger.debug(`Ignoring non-WhatsApp webhook object: ${payload.object}`);
    return;
  }

  // One POST can batch changes for several business numbers (and, for the
  // platform app, several customers). Route every change on its own.
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      try {
        await processChange(change);
      } catch (error) {
        logger.error(`Failed to process webhook change: ${(error as Error).message}`);
      }
    }
  }
}

async function processChange(change: WebhookChange): Promise<void> {
  const phoneNumberId = change.value?.metadata?.phone_number_id;
  const workspace = phoneNumberId ? getWorkspaceRuntimeByPhoneNumberId(phoneNumberId) : null;

  // Any event for the number — including delivery statuses — proves the
  // webhook is wired up.
  if (workspace) {
    markWebhookActivity(workspace.id);
  }

  const messages = extractMessagesFromValue(change.value).filter((message) =>
    claimWebhookMessage(message.messageId),
  );
  if (messages.length === 0) {
    return;
  }

  if (workspace) {
    logger.info(`Processing ${messages.length} message(s) for workspace ${workspace.id}`);
    for (const message of messages) {
      await processWorkspaceMessage(workspace, message);
    }
    return;
  }

  // The env-configured single-tenant number keeps working; anything else is
  // a number no workspace owns and must never fall back to it.
  if (config.whatsappPhoneNumberId && phoneNumberId === config.whatsappPhoneNumberId) {
    for (const message of messages) {
      await processLegacyMessage(message);
    }
    return;
  }

  logger.warn(`Ignoring ${messages.length} message(s) for unknown phone number ${phoneNumberId}`);
}

function senderLabelOf(message: ParsedMessage): string {
  return message.senderName ? `${message.senderName} (${message.from})` : message.from;
}

async function processWorkspaceMessage(
  workspace: WorkspaceRuntime,
  message: ParsedMessage,
): Promise<void> {
  const senderLabel = senderLabelOf(message);
  logger.info(`Received message from ${senderLabel} | Type: ${message.type}`);

  // Record every inbound message in the two-way inbox, regardless of
  // keyword filters or forwarding state — the inbox shows the full thread.
  insertConversationMessage({
    workspaceId: workspace.id,
    contactNumber: message.from,
    contactName: message.senderName ?? '',
    direction: 'in',
    message: message.text,
    type: message.type,
  });

  if (!passesFilterForKeywords(message.text, workspace.keywordFilters)) {
    logger.info(`Message from ${senderLabel} did not pass keyword filter - skipping.`);
    return;
  }

  if (!workspace.forwardingEnabled) {
    logger.info(`Forwarding is paused - skipping message from ${senderLabel}`);
    return;
  }

  const whatsappTo = [workspace.forwardToNumber, ...workspace.extraRecipients].filter(Boolean);
  const destinations: Array<{ channel: MessageChannel; to: string }> = [
    ...whatsappTo.map((to) => ({ channel: 'whatsapp' as const, to })),
    ...(workspace.emailForwardTo
      ? [{ channel: 'email' as const, to: workspace.emailForwardTo }]
      : []),
    ...(workspace.webhookRelayUrl
      ? [{ channel: 'webhook' as const, to: workspace.webhookRelayUrl }]
      : []),
  ];

  if (destinations.length === 0) {
    logger.info(`Workspace ${workspace.id} has no destinations - nothing to forward.`);
    return;
  }

  const record = (deliveries: Delivery[]): void => {
    for (const delivery of deliveries) {
      logMessage({
        workspace_id: workspace.id,
        from_number: message.from,
        to_number: delivery.to,
        message: message.text,
        type: message.type,
        status: delivery.success ? 'success' : 'failed',
        error: delivery.error,
        channel: delivery.channel,
      });
    }
  };

  // Free-tier monthly cap: log the skip so the user can see why.
  const owner = getUserById(workspace.userId);
  const limits = getLimits(owner?.plan ?? 'free');
  if (
    limits.monthlyMessages !== -1 &&
    getCurrentMonthUsage(workspace.id) >= limits.monthlyMessages
  ) {
    logger.warn(`Workspace ${workspace.id} exceeded its monthly cap of ${limits.monthlyMessages}.`);
    const error = `Monthly limit of ${limits.monthlyMessages} messages reached on the ${limits.label} plan. Upgrade to keep forwarding.`;
    record(destinations.map((d) => ({ ...d, success: false, error })));
    return;
  }

  const template = workspace.forwardTemplateName
    ? { name: workspace.forwardTemplateName, language: workspace.forwardTemplateLanguage }
    : undefined;

  const [whatsappResults, emailResult, webhookResult] = await Promise.all([
    whatsappTo.length > 0
      ? forwardToMultiple(
          message.from,
          message.text,
          whatsappTo,
          { accessToken: workspace.accessToken, phoneNumberId: workspace.phoneNumberId },
          template,
        )
      : Promise.resolve([]),
    workspace.emailForwardTo
      ? sendForwardEmail({
          to: workspace.emailForwardTo,
          fromNumber: message.from,
          senderName: message.senderName,
          messageText: message.text,
          businessLabel: workspace.businessLabel,
        }).then(
          () => ({ success: true }),
          (error: Error) => ({ success: false, error: error.message }),
        )
      : Promise.resolve(null),
    workspace.webhookRelayUrl
      ? relayToWebhook(workspace.webhookRelayUrl, {
          from: message.from,
          senderName: message.senderName,
          message: message.text,
          type: message.type,
          receivedAt: new Date().toISOString(),
          businessLabel: workspace.businessLabel,
        })
      : Promise.resolve(null),
  ]);

  const deliveries: Delivery[] = [
    ...whatsappResults.map((result) => ({ channel: 'whatsapp' as const, ...result })),
    ...(emailResult
      ? [{ channel: 'email' as const, to: workspace.emailForwardTo, ...emailResult }]
      : []),
    ...(webhookResult
      ? [{ channel: 'webhook' as const, to: workspace.webhookRelayUrl, ...webhookResult }]
      : []),
  ];

  for (const delivery of deliveries) {
    const target =
      delivery.channel === 'whatsapp' ? maskPhoneNumber(delivery.to) : delivery.channel;
    if (delivery.success) {
      logger.info(`Forwarded to ${target}`);
    } else {
      logger.error(`Failed to forward to ${target}: ${delivery.error}`);
    }
  }
  record(deliveries);

  // One usage event per inbound message (not per destination).
  if (deliveries.some((delivery) => delivery.success)) {
    incrementUsage(workspace.id);
  }
}

/** Single-tenant mode: the number and destinations come from the environment. */
async function processLegacyMessage(message: ParsedMessage): Promise<void> {
  const senderLabel = senderLabelOf(message);

  if (!passesFilter(message.text)) {
    logger.info(`Message from ${senderLabel} did not pass keyword filter - skipping.`);
    return;
  }
  if (!isForwardingEnabled()) {
    logger.info(`Forwarding is disabled - skipping message from ${senderLabel}`);
    return;
  }

  const recipients =
    config.forwardToNumbers.length > 0
      ? config.forwardToNumbers
      : [getForwardToNumber() || config.forwardToNumber];

  const results = await forwardToMultiple(message.from, message.text, recipients);
  for (const { to, success, error } of results) {
    if (success) {
      logger.info(`Forwarded to ${maskPhoneNumber(to)}`);
    } else {
      logger.error(`Failed to forward to ${maskPhoneNumber(to)}: ${error}`);
    }
    logMessage({
      from_number: message.from,
      to_number: to,
      message: message.text,
      type: message.type,
      status: success ? 'success' : 'failed',
      error,
    });
  }
}
