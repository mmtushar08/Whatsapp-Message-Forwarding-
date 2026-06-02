import { Request, Response } from 'express';
import { getUserById } from '../db/userStore';
import { getWorkspaceByUserId } from '../db/workspaceStore';
import {
  countRulesForWorkspace,
  createRule,
  deleteRule,
  getRulesForWorkspace,
  updateRule,
} from '../db/rulesStore';
import { getLimits } from '../services/planService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) {
    throw new Error('Phone numbers must be 7-15 digits with country code and no plus sign.');
  }
  return cleaned;
}

function validateOptionalUrl(value: string, label: string): string {
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) throw new Error(`${label} must start with http:// or https://`);
  return value.trim();
}

function validateOptionalEmail(value: string): string {
  if (!value) return '';
  if (!EMAIL_REGEX.test(value)) throw new Error('Email forwarding address is not a valid email.');
  return value.trim();
}

function getWorkspaceIdFromRequest(req: Request): string | null {
  if (!req.auth) return null;
  return getWorkspaceByUserId(req.auth.userId)?.id ?? null;
}

export function listRules(req: Request, res: Response): void {
  const workspaceId = getWorkspaceIdFromRequest(req);
  if (!workspaceId) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }
  res.status(200).json({ rules: getRulesForWorkspace(workspaceId) });
}

export function createRuleHandler(req: Request, res: Response): void {
  const workspaceId = getWorkspaceIdFromRequest(req);
  if (!workspaceId || !req.auth) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  const owner = getUserById(req.auth.userId);
  const limits = getLimits(owner?.plan ?? 'free');

  if (limits.maxAdditionalRules !== -1) {
    const current = countRulesForWorkspace(workspaceId);
    if (current >= limits.maxAdditionalRules) {
      res.status(402).json({
        error: `Your ${limits.label} plan supports up to ${limits.maxAdditionalRules} additional rule${limits.maxAdditionalRules === 1 ? '' : 's'}. Upgrade to Pro for up to 5 total forwarding rules.`,
        requiredPlan: 'pro',
      });
      return;
    }
  }

  const { name, forwardToNumber, extraRecipients, keywordFilters, forwardingEnabled, webhookRelayUrl, emailForwardTo } =
    req.body as {
      name?: string;
      forwardToNumber?: string;
      extraRecipients?: string[] | string;
      keywordFilters?: string[] | string;
      forwardingEnabled?: boolean;
      webhookRelayUrl?: string;
      emailForwardTo?: string;
    };

  if (!name || !forwardToNumber) {
    res.status(400).json({ error: 'name and forwardToNumber are required' });
    return;
  }

  try {
    const normalizedTo = normalizePhoneNumber(forwardToNumber);
    const rawExtras = Array.isArray(extraRecipients)
      ? extraRecipients
      : typeof extraRecipients === 'string'
        ? extraRecipients.split(',')
        : [];
    const normalizedExtras = rawExtras.map((v) => v.trim()).filter(Boolean).map(normalizePhoneNumber);
    const normalizedFilters = Array.isArray(keywordFilters)
      ? keywordFilters
      : typeof keywordFilters === 'string'
        ? keywordFilters.split(',').map((v) => v.trim()).filter(Boolean)
        : [];
    const validatedUrl = validateOptionalUrl(webhookRelayUrl?.trim() ?? '', 'Webhook relay URL');
    const validatedEmail = validateOptionalEmail(emailForwardTo?.trim() ?? '');

    const rule = createRule(workspaceId, {
      name: name.trim(),
      forwardToNumber: normalizedTo,
      extraRecipients: normalizedExtras,
      keywordFilters: normalizedFilters,
      forwardingEnabled: forwardingEnabled ?? true,
      webhookRelayUrl: validatedUrl,
      emailForwardTo: validatedEmail,
    });

    res.status(201).json({ rule });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export function updateRuleHandler(req: Request, res: Response): void {
  const workspaceId = getWorkspaceIdFromRequest(req);
  if (!workspaceId) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  const id = parseInt(req.params['id'] as string, 10);
  if (!id) {
    res.status(400).json({ error: 'Invalid rule ID' });
    return;
  }

  const { name, forwardToNumber, extraRecipients, keywordFilters, forwardingEnabled, webhookRelayUrl, emailForwardTo } =
    req.body as {
      name?: string;
      forwardToNumber?: string;
      extraRecipients?: string[] | string;
      keywordFilters?: string[] | string;
      forwardingEnabled?: boolean;
      webhookRelayUrl?: string;
      emailForwardTo?: string;
    };

  if (!name || !forwardToNumber) {
    res.status(400).json({ error: 'name and forwardToNumber are required' });
    return;
  }

  try {
    const normalizedTo = normalizePhoneNumber(forwardToNumber);
    const rawExtras = Array.isArray(extraRecipients)
      ? extraRecipients
      : typeof extraRecipients === 'string'
        ? extraRecipients.split(',')
        : [];
    const normalizedExtras = rawExtras.map((v) => v.trim()).filter(Boolean).map(normalizePhoneNumber);
    const normalizedFilters = Array.isArray(keywordFilters)
      ? keywordFilters
      : typeof keywordFilters === 'string'
        ? keywordFilters.split(',').map((v) => v.trim()).filter(Boolean)
        : [];
    const validatedUrl = validateOptionalUrl(webhookRelayUrl?.trim() ?? '', 'Webhook relay URL');
    const validatedEmail = validateOptionalEmail(emailForwardTo?.trim() ?? '');

    const rule = updateRule(id, workspaceId, {
      name: name.trim(),
      forwardToNumber: normalizedTo,
      extraRecipients: normalizedExtras,
      keywordFilters: normalizedFilters,
      forwardingEnabled: forwardingEnabled ?? true,
      webhookRelayUrl: validatedUrl,
      emailForwardTo: validatedEmail,
    });

    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    res.status(200).json({ rule });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export function deleteRuleHandler(req: Request, res: Response): void {
  const workspaceId = getWorkspaceIdFromRequest(req);
  if (!workspaceId) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  const id = parseInt(req.params['id'] as string, 10);
  if (!id) {
    res.status(400).json({ error: 'Invalid rule ID' });
    return;
  }

  const deleted = deleteRule(id, workspaceId);
  if (!deleted) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  res.status(200).json({ success: true });
}
