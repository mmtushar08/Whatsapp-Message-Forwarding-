import { Request, Response } from 'express';
import { getUserById } from '../db/userStore';
import { getWorkspaceByUserId } from '../db/workspaceStore';
import {
  countRulesForWorkspace,
  createRule,
  deleteRule,
  ForwardingRuleInput,
  getRulesForWorkspace,
  updateRule,
} from '../db/rulesStore';
import { getLimits } from '../services/planService';
import { normalizePhoneNumber, parseCSV, validateOptionalEmail, validateOptionalUrl } from '../utils/validation';

function workspaceId(req: Request): string | null {
  return req.auth ? (getWorkspaceByUserId(req.auth.userId)?.id ?? null) : null;
}

function parseBody(body: Record<string, unknown>): ForwardingRuleInput {
  const { name, forwardToNumber, extraRecipients, keywordFilters, forwardingEnabled, webhookRelayUrl, emailForwardTo } = body;
  if (!name || !forwardToNumber) throw new Error('name and forwardToNumber are required');
  return {
    name: String(name).trim(),
    forwardToNumber: normalizePhoneNumber(String(forwardToNumber)),
    extraRecipients: parseCSV(extraRecipients as string[] | string | undefined).map(normalizePhoneNumber),
    keywordFilters: parseCSV(keywordFilters as string[] | string | undefined),
    forwardingEnabled: forwardingEnabled !== false,
    webhookRelayUrl: validateOptionalUrl(String(webhookRelayUrl ?? '').trim(), 'Webhook relay URL'),
    emailForwardTo: validateOptionalEmail(String(emailForwardTo ?? '').trim()),
  };
}

export function listRules(req: Request, res: Response): void {
  const wsId = workspaceId(req);
  if (!wsId) { res.status(404).json({ error: 'Workspace not found', onboardingRequired: true }); return; }
  res.json({ rules: getRulesForWorkspace(wsId) });
}

export function createRuleHandler(req: Request, res: Response): void {
  const wsId = workspaceId(req);
  if (!wsId || !req.auth) { res.status(404).json({ error: 'Workspace not found', onboardingRequired: true }); return; }

  const limits = getLimits(getUserById(req.auth.userId)?.plan ?? 'free');
  if (limits.maxAdditionalRules !== -1 && countRulesForWorkspace(wsId) >= limits.maxAdditionalRules) {
    res.status(402).json({ error: 'Upgrade to Pro for multiple forwarding rules.', requiredPlan: 'pro' });
    return;
  }

  try {
    res.status(201).json({ rule: createRule(wsId, parseBody(req.body as Record<string, unknown>)) });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export function updateRuleHandler(req: Request, res: Response): void {
  const wsId = workspaceId(req);
  if (!wsId) { res.status(404).json({ error: 'Workspace not found', onboardingRequired: true }); return; }
  const id = parseInt(req.params['id'] as string, 10);
  if (!id) { res.status(400).json({ error: 'Invalid rule ID' }); return; }
  try {
    const rule = updateRule(id, wsId, parseBody(req.body as Record<string, unknown>));
    if (!rule) { res.status(404).json({ error: 'Rule not found' }); return; }
    res.json({ rule });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export function deleteRuleHandler(req: Request, res: Response): void {
  const wsId = workspaceId(req);
  if (!wsId) { res.status(404).json({ error: 'Workspace not found', onboardingRequired: true }); return; }
  const id = parseInt(req.params['id'] as string, 10);
  if (!id) { res.status(400).json({ error: 'Invalid rule ID' }); return; }
  if (!deleteRule(id, wsId)) { res.status(404).json({ error: 'Rule not found' }); return; }
  res.json({ success: true });
}
