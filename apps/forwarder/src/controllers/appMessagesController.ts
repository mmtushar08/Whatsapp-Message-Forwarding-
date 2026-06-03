import { Request, Response } from 'express';
import {
  getWorkspaceMessageLogCount,
  getWorkspaceMessageLogs,
  getWorkspaceMessageStats,
  getMessageLogByIdAndWorkspace,
  logMessage,
} from '../db/messageStore';
import { getCurrentMonthUsage } from '../db/usageStore';
import { getUserById } from '../db/userStore';
import { getWorkspaceByUserId, getWorkspaceRuntimeByUserId } from '../db/workspaceStore';
import { getLimits } from '../services/planService';
import { forwardMessageTo } from '../services/whatsappService';
import logger from '../services/loggerService';

function getWorkspaceIdFromRequest(req: Request): string | null {
  if (!req.auth) {
    return null;
  }

  return getWorkspaceByUserId(req.auth.userId)?.id ?? null;
}

export function getWorkspaceMessages(req: Request, res: Response): void {
  const workspaceId = getWorkspaceIdFromRequest(req);
  if (!workspaceId) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  const limit = Math.min(parseInt((req.query['limit'] as string) ?? '50', 10) || 50, 100);
  const offset = parseInt((req.query['offset'] as string) ?? '0', 10) || 0;
  const status = req.query['status'] as 'success' | 'failed' | undefined;
  const search = (req.query['search'] as string | undefined)?.trim() || undefined;
  const from = (req.query['from'] as string | undefined)?.trim() || undefined;
  const filter = { status, search, from };
  const data = getWorkspaceMessageLogs(workspaceId, limit, offset, filter);
  const total = getWorkspaceMessageLogCount(workspaceId, filter);

  res.status(200).json({
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

export async function resendMessage(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const workspaceId = getWorkspaceIdFromRequest(req);
  if (!workspaceId) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  const messageId = parseInt(req.params['id'] as string, 10);
  if (!messageId) {
    res.status(400).json({ error: 'Invalid message ID' });
    return;
  }

  const original = getMessageLogByIdAndWorkspace(messageId, workspaceId);
  if (!original) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  const runtime = getWorkspaceRuntimeByUserId(req.auth.userId);
  if (!runtime) {
    res.status(404).json({ error: 'Workspace credentials not found' });
    return;
  }

  try {
    await forwardMessageTo(original.from_number, original.message, original.to_number, {
      accessToken: runtime.accessToken,
      phoneNumberId: runtime.phoneNumberId,
    });

    logMessage({
      workspace_id: workspaceId,
      from_number: original.from_number,
      to_number: original.to_number,
      message: original.message,
      type: original.type,
      status: 'success',
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`Resend failed for message ${messageId}: ${(error as Error).message}`);

    logMessage({
      workspace_id: workspaceId,
      from_number: original.from_number,
      to_number: original.to_number,
      message: original.message,
      type: original.type,
      status: 'failed',
      error: (error as Error).message,
    });

    res.status(400).json({ error: (error as Error).message });
  }
}

export function getWorkspaceStats(req: Request, res: Response): void {
  const workspaceId = getWorkspaceIdFromRequest(req);
  if (!workspaceId || !req.auth) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  const stats = getWorkspaceMessageStats(workspaceId);
  const monthlyUsage = getCurrentMonthUsage(workspaceId);
  const owner = getUserById(req.auth.userId);
  const limits = getLimits(owner?.plan ?? 'free');

  res.status(200).json({
    ...stats,
    monthlyUsage,
    monthlyLimit: limits.monthlyMessages,
  });
}
