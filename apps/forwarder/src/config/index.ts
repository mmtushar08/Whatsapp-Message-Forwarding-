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
  /** Legacy single-tenant token — unused in multi-tenant mode (credentials stored per-workspace in DB) */
  whatsappAccessToken: process.env['WHATSAPP_ACCESS_TOKEN'] ?? '',

  /** Legacy single-tenant phone number ID — unused in multi-tenant mode */
  whatsappPhoneNumberId: process.env['WHATSAPP_PHONE_NUMBER_ID'] ?? '',

  /** Legacy single-tenant forward-to number — unused in multi-tenant mode */
  forwardToNumber: process.env['FORWARD_TO_NUMBER'] ?? '',

  /** Legacy verify token — unused in multi-tenant mode (stored per-workspace) */
  webhookVerifyToken: process.env['WEBHOOK_VERIFY_TOKEN'] ?? '',

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

  /** Comma-separated list of phone numbers to forward messages to */
  forwardToNumbers: (process.env['FORWARD_TO_NUMBERS'] ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0),

  /** Max retry attempts for WhatsApp API calls */
  maxRetryAttempts: parseInt(process.env['MAX_RETRY_ATTEMPTS'] ?? '3', 10),

  /** Base delay in ms for retry backoff */
  retryBaseDelayMs: parseInt(process.env['RETRY_BASE_DELAY_MS'] ?? '1000', 10),

  /** Timeout in ms for WhatsApp Graph API calls */
  whatsappTimeoutMs: parseInt(process.env['WHATSAPP_TIMEOUT_MS'] ?? '10000', 10),

  /** AES-256-GCM key for encrypting workspace secrets at rest */
  appEncryptionKey: requireEnv('APP_ENCRYPTION_KEY'),

  /** Public-facing URL of this server, used to generate webhook URLs */
  publicAppUrl: process.env['PUBLIC_APP_URL'] ?? '',
};

export default config;
