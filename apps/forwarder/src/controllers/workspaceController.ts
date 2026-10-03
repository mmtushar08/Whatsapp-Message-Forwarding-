import { Request, Response } from 'express';
import { getUserById } from '../db/userStore';
import {
  findPhoneNumberOwner,
  getWorkspaceByUserId,
  getWorkspaceRuntimeByUserId,
  upsertWorkspace,
} from '../db/workspaceStore';
import logger from '../services/loggerService';
import { getPhoneNumberDetails, MetaApiError } from '../services/metaGraphService';
import { validatePlanFeatures } from '../services/planService';
import { deriveBaseUrl } from '../utils/deriveBaseUrl';
import { assertSafeOutboundUrl } from '../utils/urlSafety';

function normalizePhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) {
    throw new Error('Phone numbers must be 7-15 digits with country code and no plus sign.');
  }
  return cleaned;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEMPLATE_NAME_REGEX = /^[a-z0-9_]{1,512}$/;

function validateOptionalEmail(value: string): string {
  if (!value) return '';
  if (!EMAIL_REGEX.test(value)) {
    throw new Error('Email forwarding address is not a valid email.');
  }
  return value.trim();
}

function parseExtraRecipients(value: string[] | string | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(',');
  return raw
    .map((v) => v.trim())
    .filter(Boolean)
    .map(normalizePhoneNumber);
}

/**
 * Checks a token can use a phone number. Auth failures block the save;
 * transient Graph outages are logged and tolerated so a Meta blip never
 * locks users out of their settings.
 */
async function validateWhatsappCredentials(
  phoneNumberId: string,
  accessToken: string,
): Promise<void> {
  try {
    await getPhoneNumberDetails(phoneNumberId, accessToken);
  } catch (error) {
    if (error instanceof MetaApiError && !error.transient) {
      throw new Error(error.message);
    }
    logger.warn(`Could not validate WhatsApp credentials: ${(error as Error).message}`);
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
    forwardTemplateName,
    forwardTemplateLanguage,
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
    forwardTemplateName?: string;
    forwardTemplateLanguage?: string;
  };

  if (!businessLabel?.trim() || !sourcePhoneNumber?.trim() || !phoneNumberId?.trim()) {
    res.status(400).json({
      error: 'businessLabel, sourcePhoneNumber, and phoneNumberId are required',
    });
    return;
  }

  const userId = req.auth.userId;
  const existing = getWorkspaceRuntimeByUserId(userId);
  const newToken = accessToken?.trim();
  const cleanPhoneNumberId = phoneNumberId.trim();

  if (!existing && !newToken) {
    res.status(400).json({ error: 'accessToken is required when creating a workspace.' });
    return;
  }

  const owner = findPhoneNumberOwner(cleanPhoneNumberId);
  if (owner && owner !== userId) {
    res.status(409).json({
      error: 'This WhatsApp number is already connected to another account.',
    });
    return;
  }

  // Re-check access whenever the token or the number changes.
  const phoneChanged = existing?.phoneNumberId !== cleanPhoneNumberId;
  if (newToken || phoneChanged) {
    try {
      await validateWhatsappCredentials(
        cleanPhoneNumberId,
        newToken || (existing?.accessToken ?? ''),
      );
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
  }

  try {
    const normalizedFilters = (
      Array.isArray(keywordFilters)
        ? keywordFilters
        : typeof keywordFilters === 'string'
          ? keywordFilters.split(',')
          : []
    )
      .map((value) => String(value).trim())
      .filter(Boolean);

    const primary = forwardToNumber?.trim() ? normalizePhoneNumber(forwardToNumber) : '';
    const normalizedExtras = parseExtraRecipients(extraRecipients);
    const relayUrl = webhookRelayUrl?.trim() ? await assertSafeOutboundUrl(webhookRelayUrl) : '';
    const email = validateOptionalEmail(emailForwardTo?.trim() ?? '');
    // No destinations is allowed: messages still reach the inbox, and the
    // dashboard prompts the user to add one.
    const enabled = forwardingEnabled ?? true;

    const templateName = forwardTemplateName?.trim();
    if (templateName && !TEMPLATE_NAME_REGEX.test(templateName)) {
      res.status(400).json({
        error: 'Template names use lowercase letters, numbers and underscores only.',
      });
      return;
    }

    const user = getUserById(userId);
    const planError = validatePlanFeatures(user?.plan ?? 'free', {
      forwardToNumber: primary,
      extraRecipients: normalizedExtras,
      webhookRelayUrl: relayUrl,
      emailForwardTo: email,
    });
    if (planError) {
      res.status(402).json({
        error: planError.message,
        field: planError.field,
        requiredPlan: planError.requiredPlan,
      });
      return;
    }

    const workspace = upsertWorkspace(userId, {
      businessLabel: businessLabel.trim(),
      sourcePhoneNumber: normalizePhoneNumber(sourcePhoneNumber),
      phoneNumberId: cleanPhoneNumberId,
      accessToken: newToken,
      appSecret: appSecret?.trim(),
      forwardToNumber: primary,
      extraRecipients: normalizedExtras,
      keywordFilters: normalizedFilters,
      forwardingEnabled: enabled,
      webhookRelayUrl: relayUrl,
      emailForwardTo: email,
      forwardTemplateName: templateName,
      forwardTemplateLanguage: forwardTemplateLanguage?.trim(),
      webhookBaseUrl: deriveBaseUrl(req),
    });

    res.status(200).json({ workspace });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
