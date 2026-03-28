import { Request, Response } from 'express';
import {
  getWorkspaceMessageLogCount,
  getWorkspaceMessageLogs,
  getWorkspaceMessageStats,
} from '../db/messageStore';
import { getWorkspaceByUserId } from '../db/workspaceStore';

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
  const data = getWorkspaceMessageLogs(workspaceId, limit, offset);
  const total = getWorkspaceMessageLogCount(workspaceId);

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

export function getWorkspaceStats(req: Request, res: Response): void {
  const workspaceId = getWorkspaceIdFromRequest(req);
  if (!workspaceId) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  res.status(200).json(getWorkspaceMessageStats(workspaceId));
}
