import dotenv from 'dotenv';
import path from 'path';

// Load .env file from the app root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates that a required environment variable is set.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  /** WhatsApp Cloud API bearer token */
  whatsappAccessToken: requireEnv('WHATSAPP_ACCESS_TOKEN'),

  /** Phone Number ID from Meta dashboard (sender) */
  whatsappPhoneNumberId: requireEnv('WHATSAPP_PHONE_NUMBER_ID'),

  /** The destination phone number to forward messages to (no + sign) */
  forwardToNumber: requireEnv('FORWARD_TO_NUMBER'),

  /** Token used to verify webhook with Meta */
  webhookVerifyToken: requireEnv('WEBHOOK_VERIFY_TOKEN'),

  /** Express server port */
  port: parseInt(process.env['PORT'] ?? '3000', 10),

  /**
   * Optional comma-separated keyword filters.
   * If empty, all messages are forwarded.
   */
  keywordFilters: process.env['KEYWORD_FILTERS']
    ? process.env['KEYWORD_FILTERS']
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
    : [],

  /** Winston log level */
  logLevel: process.env['LOG_LEVEL'] ?? 'info',

  /** WhatsApp App Secret (for webhook signature verification) — optional but recommended */
  appSecret: process.env['WHATSAPP_APP_SECRET'] ?? '',
};

export default config;
