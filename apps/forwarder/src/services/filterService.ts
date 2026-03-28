import { getKeywordFilters } from '../controllers/configController';
import logger from './loggerService';

export function passesFilter(messageText: string): boolean {
  return passesFilterForKeywords(messageText, getKeywordFilters());
}

export function passesFilterForKeywords(messageText: string, keywordFilters: string[]): boolean {
  if (keywordFilters.length === 0) {
    logger.debug('No keyword filters configured - forwarding all messages');
    return true;
  }

  const lowerText = messageText.toLowerCase();
  const matched = keywordFilters.some((keyword) => lowerText.includes(keyword));

  if (matched) {
    logger.debug(`Message passed keyword filter. Filters: [${keywordFilters.join(', ')}]`);
  } else {
    logger.debug(`Message did NOT pass keyword filter. Filters: [${keywordFilters.join(', ')}]`);
  }

  return matched;
}
