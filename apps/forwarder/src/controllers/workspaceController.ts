import { Request, Response } from 'express';
import { getWorkspaceByUserId, upsertWorkspace } from '../db/workspaceStore';

function normalizePhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) {
    throw new Error('Phone numbers must be 7-15 digits with country code and no plus sign.');
  }
  return cleaned;
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

export function saveWorkspace(req: Request, res: Response): void {
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
    keywordFilters,
    forwardingEnabled,
  } = req.body as {
    businessLabel?: string;
    sourcePhoneNumber?: string;
    phoneNumberId?: string;
    accessToken?: string;
    appSecret?: string;
    forwardToNumber?: string;
    keywordFilters?: string[] | string;
    forwardingEnabled?: boolean;
  };

  if (!businessLabel || !sourcePhoneNumber || !phoneNumberId || !accessToken || !forwardToNumber) {
    res.status(400).json({
      error:
        'businessLabel, sourcePhoneNumber, phoneNumberId, accessToken, and forwardToNumber are required',
    });
    return;
  }

  try {
    const normalizedFilters = Array.isArray(keywordFilters)
      ? keywordFilters
      : typeof keywordFilters === 'string'
        ? keywordFilters.split(',').map((value) => value.trim()).filter(Boolean)
        : [];

    const workspace = upsertWorkspace(req.auth.userId, {
      businessLabel: businessLabel.trim(),
      sourcePhoneNumber: normalizePhoneNumber(sourcePhoneNumber),
      phoneNumberId: phoneNumberId.trim(),
      accessToken: accessToken?.trim(),
      appSecret: appSecret?.trim(),
      forwardToNumber: normalizePhoneNumber(forwardToNumber),
      keywordFilters: normalizedFilters,
      forwardingEnabled: forwardingEnabled ?? true,
    });

    res.status(200).json({ workspace });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
