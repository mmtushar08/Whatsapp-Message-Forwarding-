import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSmtpStatus } from '../api/client';
import { useProduct } from '../context/ProductContext';
import { PLAN_CAPABILITIES } from '../types';

const INPUT_STYLE = { border: '1.5px solid #DCE4DF' } as const;
const LABEL_CLASS = 'block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5';
const LABEL_STYLE = { color: '#5C6B63' } as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[14px] p-6 mb-5" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
      <h2 className="text-base font-bold mb-4 tracking-tight" style={{ color: '#14201B' }}>{title}</h2>
      {children}
    </div>
  );
}

function UpgradePrompt({ requiredPlan, feature }: { requiredPlan: string; feature: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-[10px] px-4 py-3 text-xs" style={{ background: '#E4F6EC', border: '1px solid #BFE7D1', color: '#11713E' }}>
      <span>🔒</span>
      <div>
        <strong>{feature}</strong> is available on <strong>{requiredPlan}</strong> and above.{' '}
        <Link to="/pricing" className="font-semibold underline">See pricing →</Link>
      </div>
    </div>
  );
}

export default function Settings() {
  const { workspace, saveWorkspace, currentUser } = useProduct();
  const plan = currentUser?.plan ?? 'free';
  const caps = PLAN_CAPABILITIES[plan];

  const [businessLabel, setBusinessLabel] = useState(workspace?.businessLabel ?? '');
  const [sourcePhoneNumber, setSourcePhoneNumber] = useState(workspace?.sourcePhoneNumber ?? '');
  const [phoneNumberId, setPhoneNumberId] = useState(workspace?.phoneNumberId ?? '');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [forwardToNumber, setForwardToNumber] = useState(workspace?.forwardToNumber ?? '');
  const [extraRecipients, setExtraRecipients] = useState<string[]>(workspace?.extraRecipients ?? []);
  const [keywordFilters, setKeywordFilters] = useState(workspace?.keywordFilters.join(', ') ?? '');
  const [forwardingEnabled, setForwardingEnabled] = useState(workspace?.forwardingEnabled ?? true);
  const [webhookRelayUrl, setWebhookRelayUrl] = useState(workspace?.webhookRelayUrl ?? '');
  const [emailForwardTo, setEmailForwardTo] = useState(workspace?.emailForwardTo ?? '');
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSmtpStatus().then((s) => setSmtpConfigured(s.smtpConfigured));
  }, []);

  if (!workspace) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Settings</h1>
        <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>Connect WhatsApp first to manage your forwarding settings.</p>
        <Link to="/onboarding" className="inline-block rounded-[11px] px-6 py-3 text-sm font-semibold text-white no-underline" style={{ background: '#1FAB5E' }}>
          Connect WhatsApp →
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(null);
    setError(null);
    const result = await saveWorkspace({
      businessLabel,
      sourcePhoneNumber,
      phoneNumberId,
      accessToken,
      appSecret,
      forwardToNumber,
      extraRecipients: extraRecipients.map((n) => n.trim()).filter(Boolean),
      keywordFilters,
      forwardingEnabled,
      webhookRelayUrl: webhookRelayUrl.trim(),
      emailForwardTo: emailForwardTo.trim(),
    });
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    setSaved('Workspace settings saved successfully.');
  }

  const setupIncomplete = !workspace.sourcePhoneNumber || !workspace.forwardToNumber;

  return (
    <div className="max-w-3xl">
      <h1 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Settings</h1>
      <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>Workspace · {workspace.businessLabel || 'My Business'}</p>

      {setupIncomplete && (
        <div className="mb-5 rounded-[10px] px-4 py-3 text-sm" style={{ background: '#FBF0DC', border: '1px solid #E8A23D', color: '#8A5A0F' }}>
          <strong>Finish setup:</strong> add your source WhatsApp number and a forwarding destination below, then save.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Section title="WhatsApp connection">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>Business label</label>
              <input className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}
                value={businessLabel} onChange={(e) => setBusinessLabel(e.target.value)} required />
            </div>
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>Source WhatsApp number</label>
              <input className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}
                value={sourcePhoneNumber} onChange={(e) => setSourcePhoneNumber(e.target.value)}
                placeholder="919876543210" required />
            </div>
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>Phone number ID</label>
              <input className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none font-mono" style={INPUT_STYLE}
                value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} required />
            </div>
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>Replace access token</label>
              <input type="password" className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}
                value={accessToken} onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Leave blank to keep current" />
            </div>
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>Replace app secret</label>
              <input type="password" className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}
                value={appSecret} onChange={(e) => setAppSecret(e.target.value)}
                placeholder={workspace.appSecretConfigured ? 'Leave blank to keep existing' : 'Optional but recommended'} />
            </div>
          </div>
        </Section>

        <Section title="Forwarding destinations">
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>Primary WhatsApp destination</label>
              <input className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}
                value={forwardToNumber} onChange={(e) => setForwardToNumber(e.target.value)}
                placeholder="919000011122" required />
              <span className="mt-1.5 block text-xs" style={{ color: '#5C6B63' }}>Country code, no + sign. Required.</span>
            </div>

            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>
                Extra WhatsApp destinations <span className="font-normal normal-case">(optional)</span>
              </label>
              <div className="space-y-2">
                {extraRecipients.map((value, index) => (
                  <div key={index} className="flex gap-2">
                    <input className="flex-1 rounded-[10px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}
                      value={value}
                      onChange={(e) => setExtraRecipients((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))}
                      placeholder="919000011122" />
                    <button type="button"
                      onClick={() => setExtraRecipients((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-[9px] px-3 py-1.5 text-sm font-semibold border"
                      style={{ borderColor: '#F0CBC9', color: '#D9534F' }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {caps.maxDestinations > 1 ? (
                <button type="button" onClick={() => setExtraRecipients((prev) => [...prev, ''])}
                  className="mt-2.5 rounded-[9px] px-3 py-1.5 text-sm font-semibold border"
                  style={{ borderColor: '#1FAB5E', color: '#168B4B' }}>
                  + Add another number
                </button>
              ) : (
                <UpgradePrompt requiredPlan="Pro" feature="Multi-destination fan-out" />
              )}
            </div>

            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>
                Webhook relay URL <span className="font-normal normal-case">(optional)</span>
              </label>
              <input type="url" disabled={!caps.webhookRelay}
                className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                style={INPUT_STYLE}
                value={caps.webhookRelay ? webhookRelayUrl : ''}
                onChange={(e) => setWebhookRelayUrl(e.target.value)}
                placeholder="https://your-app.com/incoming" />
              {caps.webhookRelay ? (
                <span className="mt-1.5 block text-xs" style={{ color: '#5C6B63' }}>
                  POSTs a JSON payload of every inbound message to your URL.
                </span>
              ) : (
                <UpgradePrompt requiredPlan="Pro" feature="Webhook relay" />
              )}
            </div>

            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>
                Email forwarding address <span className="font-normal normal-case">(optional)</span>
              </label>
              <input type="email" disabled={!caps.emailForward}
                className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                style={INPUT_STYLE}
                value={caps.emailForward ? emailForwardTo : ''}
                onChange={(e) => setEmailForwardTo(e.target.value)}
                placeholder="you@example.com" />
              {!caps.emailForward && <UpgradePrompt requiredPlan="Starter" feature="Email forwarding" />}
              {caps.emailForward && emailForwardTo.trim() && smtpConfigured === false && (
                <div className="mt-2 rounded-[10px] px-4 py-3 text-xs" style={{ background: '#FBF0DC', border: '1px solid #E8A23D', color: '#8A5A0F' }}>
                  <strong>Email delivery is currently disabled.</strong> The server has no SMTP credentials configured,
                  so emails to <code>{emailForwardTo.trim()}</code> won't be sent.
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section title="Filters">
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>Keyword filters</label>
              <input className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}
                value={keywordFilters} onChange={(e) => setKeywordFilters(e.target.value)}
                placeholder="urgent, invoice, vip" />
              <span className="mt-1.5 block text-xs" style={{ color: '#5C6B63' }}>
                Comma-separated. Leave blank to forward every message.
              </span>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-[10px] px-4 py-3 text-sm"
              style={{ background: '#FAFCFA', border: '1px solid #DCE4DF', color: '#14201B' }}>
              <input type="checkbox" checked={forwardingEnabled}
                onChange={(e) => setForwardingEnabled(e.target.checked)}
                className="accent-[#1FAB5E]" />
              Forward incoming messages automatically
            </label>
          </div>
        </Section>

        <Section title="Webhook endpoint (for Meta dashboard)">
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span style={{ color: '#5C6B63' }}>Callback URL</span>
              <code className="rounded-[7px] px-2.5 py-1.5 font-mono text-xs" style={{ background: '#EDF1EE' }}>{workspace.webhookUrl}</code>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span style={{ color: '#5C6B63' }}>Verify token</span>
              <code className="rounded-[7px] px-2.5 py-1.5 font-mono text-xs" style={{ background: '#EDF1EE' }}>{workspace.webhookVerifyToken}</code>
            </div>
          </div>
        </Section>

        {saved && (
          <div className="mb-4 rounded-[10px] px-4 py-3 text-sm" style={{ background: '#E4F6EC', border: '1px solid #BFE7D1', color: '#11713E' }}>
            {saved}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-[10px] px-4 py-3 text-sm" style={{ background: '#FBE3E2', border: '1px solid #F0CBC9', color: '#A03330' }}>
            {error}
          </div>
        )}

        <button disabled={saving}
          className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
          style={{ background: '#1FAB5E' }}>
          {saving ? 'Saving changes…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
