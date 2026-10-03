import nodemailer from 'nodemailer';

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendForwardEmail(params: {
  to: string;
  fromNumber: string;
  senderName: string | undefined;
  messageText: string;
  businessLabel: string;
}): Promise<void> {
  if (!transporter) {
    throw new Error('Email delivery is not configured on the server (SMTP_HOST missing).');
  }

  const senderDisplay = params.senderName
    ? `${params.senderName} (${params.fromNumber})`
    : params.fromNumber;
  // Message text comes from arbitrary WhatsApp senders — never trust it as HTML.
  const html = {
    label: escapeHtml(params.businessLabel),
    sender: escapeHtml(senderDisplay),
    text: escapeHtml(params.messageText),
  };

  await transporter.sendMail({
    from: { name: params.businessLabel.replace(/["\r\n]/g, ''), address: smtpFrom },
    to: params.to,
    subject: `New WhatsApp message from ${senderDisplay}`,
    text: `You received a WhatsApp message on ${params.businessLabel}.\n\nFrom: ${senderDisplay}\n\n${params.messageText}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.1em">
          ${html.label} — WhatsApp Forwarder
        </p>
        <h2 style="font-size:20px;color:#111827;margin:8px 0">New message from ${html.sender}</h2>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:16px">
          <p style="margin:0;color:#374151;white-space:pre-wrap">${html.text}</p>
        </div>
      </div>`,
  });
}
