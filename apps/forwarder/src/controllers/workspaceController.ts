import axios, { AxiosError } from 'axios';
import { Request, Response } from 'express';
import config from '../config';
import { getUserById } from '../db/userStore';
import { getWorkspaceByUserId, getWorkspaceRuntimeByUserId, upsertWorkspace } from '../db/workspaceStore';
import logger from '../services/loggerService';
import { validatePlanFeatures } from '../services/planService';
import { forwardMessageTo } from '../services/whatsappService';
import { normalizePhoneNumber, parseCSV, validateOptionalEmail, validateOptionalUrl } from '../utils/validation';

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

function deriveWebhookBaseUrl(req: Request): string {
  if (config.publicAppUrl) return config.publicAppUrl.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol;
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

async function validateWhatsappCredentials(phoneNumberId: string, accessToken: string): Promise<void> {
  try {
    await axios.get(`${GRAPH_API_URL}/${phoneNumberId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: config.whatsappTimeoutMs,
    });
  } catch (error) {
    const status = (error as AxiosError).response?.status;
    if (status === 401 || status === 403) {
      throw new Error('Invalid WhatsApp credentials. Please check your Phone Number ID and Access Token in the Meta Developer dashboard.');
    }
    if (status === 404) {
      throw new Error('Phone Number ID not found. Make sure you copied it from the correct Meta app.');
    }
    logger.warn(`Could not validate WhatsApp credentials (non-auth error): ${(error as Error).message}`);
  }
}

export function getWorkspace(req: Request, res: Response): void {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const workspace = getWorkspaceByUserId(req.auth.userId);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  res.status(200).json({ workspace });
}

export async function saveWorkspace(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const {
    businessLabel,
    sourcePhoneNumber,
    phoneNumberId,
    accessToken,
    appSecret,
    forwardToNumber,
    extraRecipients,
    keywordFilters,
    forwardingEnabled,
    webhookRelayUrl,
    emailForwardTo,
  } = req.body as {
    businessLabel?: string;
    sourcePhoneNumber?: string;
    phoneNumberId?: string;
    accessToken?: string;
    appSecret?: string;
    forwardToNumber?: string;
    extraRecipients?: string[] | string;
    keywordFilters?: string[] | string;
    forwardingEnabled?: boolean;
    webhookRelayUrl?: string;
    emailForwardTo?: string;
  };

  if (!businessLabel || !sourcePhoneNumber || !phoneNumberId || !forwardToNumber) {
    res.status(400).json({
      error: 'businessLabel, sourcePhoneNumber, phoneNumberId, and forwardToNumber are required',
    });
    return;
  }

  const existingWorkspace = getWorkspaceByUserId(req.auth.userId);
  const isNewWorkspace = !existingWorkspace;
  const tokenToValidate = accessToken?.trim();

  if (isNewWorkspace && !tokenToValidate) {
    res.status(400).json({ error: 'accessToken is required when creating a workspace.' });
    return;
  }

  if (tokenToValidate) {
    try {
      await validateWhatsappCredentials(phoneNumberId.trim(), tokenToValidate);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
  }

  try {
    const normalizedFilters = parseCSV(keywordFilters);
    const normalizedExtras = parseCSV(extraRecipients).map(normalizePhoneNumber);
    const validatedRelayUrl = validateOptionalUrl(webhookRelayUrl?.trim() ?? '', 'Webhook relay URL');
    const validatedEmail = validateOptionalEmail(emailForwardTo?.trim() ?? '');

    const user = getUserById(req.auth.userId);
    const userPlan = user?.plan ?? 'free';
    const planError = validatePlanFeatures(userPlan, {
      extraRecipients: normalizedExtras,
      webhookRelayUrl: validatedRelayUrl,
      emailForwardTo: validatedEmail,
    });
    if (planError) {
      res.status(402).json({
        error: planError.message,
        field: planError.field,
        requiredPlan: planError.requiredPlan,
      });
      return;
    }

    const workspace = upsertWorkspace(req.auth.userId, {
      businessLabel: businessLabel.trim(),
      sourcePhoneNumber: normalizePhoneNumber(sourcePhoneNumber),
      phoneNumberId: phoneNumberId.trim(),
      accessToken: tokenToValidate,
      appSecret: appSecret?.trim(),
      forwardToNumber: normalizePhoneNumber(forwardToNumber),
      extraRecipients: normalizedExtras,
      keywordFilters: normalizedFilters,
      forwardingEnabled: forwardingEnabled ?? true,
      webhookRelayUrl: validatedRelayUrl,
      emailForwardTo: validatedEmail,
      webhookBaseUrl: deriveWebhookBaseUrl(req),
    });

    res.status(200).json({ workspace });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function testWorkspace(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const runtime = getWorkspaceRuntimeByUserId(req.auth.userId);
  if (!runtime) {
    res.status(404).json({ error: 'Workspace not found. Complete setup first.' });
    return;
  }

  try {
    await forwardMessageTo(
      'WhatsApp Forwarder',
      'Test message — your forwarding setup is working correctly.',
      runtime.forwardToNumber,
      { accessToken: runtime.accessToken, phoneNumberId: runtime.phoneNumberId },
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
