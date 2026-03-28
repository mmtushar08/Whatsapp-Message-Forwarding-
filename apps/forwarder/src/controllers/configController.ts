import { Request, Response } from 'express';
import {
  getPersistedForwardingEnabled,
  getPersistedForwardToNumber,
  getPersistedKeywordFilters,
  persistForwardingEnabled,
  persistForwardToNumber,
  persistKeywordFilters,
} from '../db/configStore';
import logger from '../services/loggerService';

let currentForwardToNumber: string = getPersistedForwardToNumber();
let currentKeywordFilters: string[] = getPersistedKeywordFilters();
let currentForwardingEnabled: boolean = getPersistedForwardingEnabled();

export interface DashboardSettings {
  forwardToNumber: string;
  keywordFilters: string[];
  forwardingEnabled: boolean;
}

export function getForwardToNumber(): string {
  return currentForwardToNumber;
}

export function getKeywordFilters(): string[] {
  return currentKeywordFilters;
}

export function isForwardingEnabled(): boolean {
  return currentForwardingEnabled;
}

export function getDashboardSettings(): DashboardSettings {
  return {
    forwardToNumber: currentForwardToNumber,
    keywordFilters: currentKeywordFilters,
    forwardingEnabled: currentForwardingEnabled,
  };
}

function normalizePhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) {
    throw new Error('Invalid phone number. Must be 7-15 digits with country code (no + sign).');
  }

  return cleaned;
}

function normalizeKeywordFilters(keywordFilters: unknown): string[] {
  const rawValues = Array.isArray(keywordFilters)
    ? keywordFilters
    : typeof keywordFilters === 'string'
      ? keywordFilters.split(',')
      : [];

  return rawValues
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);
}

function applySettingsUpdate(input: {
  phoneNumber?: string;
  keywordFilters?: unknown;
  forwardingEnabled?: unknown;
}): DashboardSettings {
  if (typeof input.phoneNumber === 'string') {
    currentForwardToNumber = normalizePhoneNumber(input.phoneNumber);
    persistForwardToNumber(currentForwardToNumber);
  }

  if (input.keywordFilters !== undefined) {
    currentKeywordFilters = normalizeKeywordFilters(input.keywordFilters);
    persistKeywordFilters(currentKeywordFilters);
  }

  if (typeof input.forwardingEnabled === 'boolean') {
    currentForwardingEnabled = input.forwardingEnabled;
    persistForwardingEnabled(currentForwardingEnabled);
  }

  return getDashboardSettings();
}

export function getSettings(_req: Request, res: Response): void {
  res.status(200).json({
    settings: getDashboardSettings(),
    meta: {
      webhookPath: '/webhook',
      healthPath: '/health',
      messagesPath: '/messages',
      docsPath: '/docs',
    },
  });
}

export function updateSettings(req: Request, res: Response): void {
  const { phoneNumber, keywordFilters, forwardingEnabled } = req.body as {
    phoneNumber?: string;
    keywordFilters?: string[] | string;
    forwardingEnabled?: boolean;
  };

  if (
    phoneNumber === undefined &&
    keywordFilters === undefined &&
    forwardingEnabled === undefined
  ) {
    res.status(400).json({
      error: 'At least one of phoneNumber, keywordFilters, or forwardingEnabled is required.',
    });
    return;
  }

  try {
    const previous = getDashboardSettings();
    const current = applySettingsUpdate({ phoneNumber, keywordFilters, forwardingEnabled });

    logger.info(
      `Dashboard settings updated | Forwarding: ${previous.forwardingEnabled} -> ${current.forwardingEnabled} | Filters: ${previous.keywordFilters.length} -> ${current.keywordFilters.length}`,
    );

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      previous,
      current,
    });
  } catch (error) {
    res.status(400).json({
      error: (error as Error).message,
      example: '12345678900',
    });
  }
}

export function updateForwardToNumber(req: Request, res: Response): void {
  const { phoneNumber } = req.body as { phoneNumber?: string };

  if (!phoneNumber) {
    res.status(400).json({ error: 'phoneNumber is required' });
    return;
  }

  try {
    const previous = currentForwardToNumber;
    const current = applySettingsUpdate({ phoneNumber }).forwardToNumber;

    logger.info(`Forward-to number updated: ****${previous.slice(-4)} -> ****${current.slice(-4)}`);

    res.status(200).json({
      success: true,
      message: 'Forward-to number updated successfully',
      previous,
      current,
    });
  } catch (error) {
    res.status(400).json({
      error: (error as Error).message,
      example: '12345678900',
    });
  }
}
