import { Request, Response } from 'express';
import { getMessageLogs, getMessageLogCount, getMessageStats } from '../db/messageStore';

/**
 * GET /messages
 * Returns paginated message forwarding history.
 *
 * Query params:
 * - limit (default: 50, max: 100)
 * - offset (default: 0)
 */
export function getMessages(req: Request, res: Response): void {
  const rawLimit = parseInt((req.query['limit'] as string) ?? '50', 10);
  const rawOffset = parseInt((req.query['offset'] as string) ?? '0', 10);

  const limit = isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 100);
  const offset = isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);

  const messages = getMessageLogs(limit, offset);
  const total = getMessageLogCount();

  res.json({
    data: messages,
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
 * Returns aggregate statistics about forwarded messages.
 */
export function getStats(_req: Request, res: Response): void {
  const stats = getMessageStats();
  res.json(stats);
}
