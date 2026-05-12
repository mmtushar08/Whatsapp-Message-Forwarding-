import nodemailer from 'nodemailer';
import logger from './loggerService';

const smtpHost = process.env['SMTP_HOST'] ?? '';
const smtpPort = parseInt(process.env['SMTP_PORT'] ?? '587', 10);
const smtpSecure = process.env['SMTP_SECURE'] === 'true';
const smtpUser = process.env['SMTP_USER'] ?? '';
const smtpPass = process.env['SMTP_PASS'] ?? '';
const smtpFrom = process.env['SMTP_FROM'] ?? smtpUser;

const transporter = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    })
  : null;

export function isEmailConfigured(): boolean {
  return transporter !== null;
}

export async function sendForwardEmail(params: {
  to: string;
  fromNumber: string;
  senderName: string | undefined;
  messageText: string;
  businessLabel: string;
}): Promise<void> {
  if (!transporter) {
    logger.warn('Email forwarding requested but SMTP is not configured — skipping.');
    return;
  }

  const senderDisplay = params.senderName
    ? `${params.senderName} (${params.fromNumber})`
    : params.fromNumber;

  await transporter.sendMail({
    from: `"${params.businessLabel}" <${smtpFrom}>`,
    to: params.to,
    subject: `New WhatsApp message from ${senderDisplay}`,
    text: `You received a WhatsApp message on ${params.businessLabel}.\n\nFrom: ${senderDisplay}\n\n${params.messageText}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.1em">
          ${params.businessLabel} — WhatsApp Forwarder
        </p>
        <h2 style="font-size:20px;color:#111827;margin:8px 0">New message from ${senderDisplay}</h2>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:16px">
          <p style="margin:0;color:#374151;white-space:pre-wrap">${params.messageText}</p>
        </div>
      </div>`,
  });
}
