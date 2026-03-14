import { Request, Response } from 'express';
import { getMessageLogCount, getMessageLogs, getMessageStats } from '../db/messageStore';

/**
 * GET /messages?limit=50&offset=0
 * Returns paginated message logs with pagination metadata, newest first.
 */
export function getMessages(req: Request, res: Response): void {
  const limit = Math.min(parseInt((req.query['limit'] as string) ?? '50', 10) || 50, 100);
  const offset = parseInt((req.query['offset'] as string) ?? '0', 10) || 0;

  const data = getMessageLogs(limit, offset);
  const total = getMessageLogCount();

  res.json({
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

/**
 * GET /messages/stats
 * Returns aggregate counts: total, success, and failed.
 */
export function getStats(_req: Request, res: Response): void {
  const stats = getMessageStats();
  res.json(stats);
}
