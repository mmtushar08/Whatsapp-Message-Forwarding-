import config from '../config';
import logger from './loggerService';

/**
 * Checks whether a message passes the configured keyword filters.
 *
 * - If no keywords are configured, ALL messages pass (return true).
 * - If keywords are configured, a message passes only if it contains
 *   at least one of the configured keywords (case-insensitive).
 *
 * @param messageText - The text content of the incoming message.
 * @returns true if the message should be forwarded, false if it should be skipped.
 */
export function passesFilter(messageText: string): boolean {
  // No filters configured → forward everything
  if (config.keywordFilters.length === 0) {
    logger.debug('No keyword filters configured — forwarding all messages');
    return true;
  }

  const lowerText = messageText.toLowerCase();
  const matched = config.keywordFilters.some((keyword) => lowerText.includes(keyword));

  if (matched) {
    logger.debug(`Message passed keyword filter. Filters: [${config.keywordFilters.join(', ')}]`);
  } else {
    logger.debug(
      `Message did NOT pass keyword filter. Filters: [${config.keywordFilters.join(', ')}]`,
    );
  }

  return matched;
}
