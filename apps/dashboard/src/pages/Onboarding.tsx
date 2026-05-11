import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

const STEPS = [
  { number: 1, label: 'Connect WhatsApp' },
  { number: 2, label: 'Forwarding rule' },
  { number: 3, label: 'Finish setup' },
] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-10 flex items-start justify-center">
      {STEPS.map((s, i) => (
        <div key={s.number} className="flex items-start">
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                current > s.number
                  ? 'bg-emerald-700 text-white'
                  : current === s.number
                    ? 'bg-emerald-700 text-white ring-4 ring-emerald-100'
                    : 'bg-stone-200 text-stone-400'
              }`}
            >
              {current > s.number ? '✓' : s.number}
            </div>
            <span
              className={`w-24 text-center text-xs font-medium ${
                current >= s.number ? 'text-stone-700' : 'text-stone-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mt-[1.1rem] h-px w-16 transition-all ${
                current > s.number ? 'bg-emerald-700' : 'bg-stone-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldHint({ children }: { children: string }) {
  return <span className="mt-1.5 block text-xs text-stone-400">{children}</span>;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs font-semibold text-emerald-700 hover:underline"
    >
      {copied ? 'Copied!' : `Copy ${label}`}
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { workspace, saveWorkspace } = useProduct();
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [businessLabel, setBusinessLabel] = useState(workspace?.businessLabel ?? '');
  const [sourcePhoneNumber, setSourcePhoneNumber] = useState(workspace?.sourcePhoneNumber ?? '');
  const [phoneNumberId, setPhoneNumberId] = useState(workspace?.phoneNumberId ?? '');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');

  // Step 2 fields
  const [forwardToNumber, setForwardToNumber] = useState(workspace?.forwardToNumber ?? '');
  const [keywordFilters, setKeywordFilters] = useState(workspace?.keywordFilters.join(', ') ?? '');
  const [forwardingEnabled, setForwardingEnabled] = useState(workspace?.forwardingEnabled ?? true);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setBusinessLabel(workspace.businessLabel);
    setSourcePhoneNumber(workspace.sourcePhoneNumber);
    setPhoneNumberId(workspace.phoneNumberId);
    setForwardToNumber(workspace.forwardToNumber);
    setKeywordFilters(workspace.keywordFilters.join(', '));
    setForwardingEnabled(workspace.forwardingEnabled);
  }, [workspace]);

  function handleStep1(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStep(2);
  }

  async function handleStep2(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveWorkspace({
      businessLabel,
      sourcePhoneNumber,
      phoneNumberId,
      accessToken,
      appSecret,
      forwardToNumber,
      keywordFilters,
      forwardingEnabled,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep(3);
  }

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <StepIndicator current={step} />

        {/* ── Step 1: Connect WhatsApp ── */}
        {step === 1 && (
          <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">
              Step 1 of 3
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">
              Connect WhatsApp
            </h1>
            <p className="mt-3 text-sm text-stone-600">
              Enter your WhatsApp Business credentials from your{' '}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald-700 hover:underline"
              >
                Meta Developer App
              </a>
              .
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleStep1}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  Workspace name
                </span>
                <input
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                  value={businessLabel}
                  onChange={(e) => setBusinessLabel(e.target.value)}
                  placeholder="Acme Sales Inbox"
                  required
                />
                <FieldHint>A friendly name to identify this forwarding setup.</FieldHint>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  WhatsApp business number
                </span>
                <input
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                  value={sourcePhoneNumber}
                  onChange={(e) => setSourcePhoneNumber(e.target.value)}
                  placeholder="15551234567"
                  required
                />
                <FieldHint>The number that receives messages — include country code, no +.</FieldHint>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-700">Phone number ID</span>
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Where do I find this? ↗
                  </a>
                </div>
                <input
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="123456789012345"
                  required
                />
                <FieldHint>
                  Found under WhatsApp → Getting Started in your Meta Developer App.
                </FieldHint>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-700">Access token</span>
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Where do I find this? ↗
                  </a>
                </div>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Paste your Cloud API token"
                  required={!workspace}
                />
                <FieldHint>
                  {workspace
                    ? 'Leave blank to keep your existing token.'
                    : 'Your permanent or temporary API token from Meta.'}
                </FieldHint>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  App secret{' '}
                  <span className="font-normal text-stone-400">(optional)</span>
                </span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={
                    workspace?.appSecretConfigured
                      ? 'Leave blank to keep existing secret'
                      : 'Enables webhook signature verification'
                  }
                />
                <FieldHint>
                  Recommended — prevents spoofed requests from reaching your webhook.
                </FieldHint>
              </label>

              <button className="w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">
                Continue to forwarding rule →
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2: Forwarding rule ── */}
        {step === 2 && (
          <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">
              Step 2 of 3
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">
              Set forwarding rule
            </h1>
            <p className="mt-3 text-sm text-stone-600">
              Choose where incoming messages are sent and whether to filter by keyword.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleStep2}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  Forward to number
                </span>
                <input
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                  value={forwardToNumber}
                  onChange={(e) => setForwardToNumber(e.target.value)}
                  placeholder="15559876543"
                  required
                />
                <FieldHint>
                  The number that receives forwarded messages — include country code, no +.
                </FieldHint>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  Keyword filters{' '}
                  <span className="font-normal text-stone-400">(optional)</span>
                </span>
                <input
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                  value={keywordFilters}
                  onChange={(e) => setKeywordFilters(e.target.value)}
                  placeholder="urgent, invoice, vip"
                />
                <FieldHint>
                  Comma-separated words. Only messages containing any of these are forwarded.
                  Leave empty to forward everything.
                </FieldHint>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={forwardingEnabled}
                  onChange={(e) => setForwardingEnabled(e.target.checked)}
                  className="accent-emerald-700"
                />
                Start with forwarding enabled
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(1);
                  }}
                  className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {saving ? 'Saving workspace...' : 'Connect workspace'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 3: Finish setup ── */}
        {step === 3 && (
          <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">
              Step 3 of 3
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">
              You're all set
            </h1>
            <p className="mt-3 text-sm text-stone-600">
              Your workspace is saved. Paste these two values into your Meta Developer App to
              activate forwarding.
            </p>

            <div className="mt-8 space-y-3">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-stone-700">Webhook URL</span>
                  {workspace?.webhookUrl && (
                    <CopyButton value={workspace.webhookUrl} label="URL" />
                  )}
                </div>
                <div className="mt-2 break-all text-sm text-stone-600">
                  {workspace?.webhookUrl ?? '—'}
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-stone-700">Verify token</span>
                  {workspace?.webhookVerifyToken && (
                    <CopyButton value={workspace.webhookVerifyToken} label="token" />
                  )}
                </div>
                <div className="mt-2 break-all text-sm text-stone-600">
                  {workspace?.webhookVerifyToken ?? '—'}
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="mb-3 text-sm font-semibold text-stone-700">
                  How to finish in Meta
                </p>
                <ol className="space-y-1.5 pl-4 text-sm text-stone-600" style={{ listStyleType: 'decimal' }}>
                  <li>Open your Meta Developer App and select your app.</li>
                  <li>Go to WhatsApp → Configuration → Webhooks.</li>
                  <li>Paste the Webhook URL and Verify token above, then click Verify.</li>
                  <li>Subscribe to the <strong>messages</strong> webhook field.</li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/app')}
              className="mt-6 w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
