import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSmtpStatus } from '../api/client';
import { useProduct } from '../context/ProductContext';
import { PLAN_CAPABILITIES } from '../types';

function UpgradePrompt({ requiredPlan, feature }: { requiredPlan: string; feature: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
      <span>🔒</span>
      <div className="flex-1">
        <strong>{feature}</strong> is available on <strong>{requiredPlan}</strong> and above.{' '}
        <Link to="/pricing" className="font-semibold underline">
          See pricing →
        </Link>
      </div>
    </div>
  );
}

export default function Settings() {
  const { workspace, saveWorkspace, currentUser } = useProduct();
  const plan = currentUser?.plan ?? 'free';
  const caps = PLAN_CAPABILITIES[plan];
  const canAddMoreDestinations = caps.maxDestinations > 1;
  const canUseWebhookRelay = caps.webhookRelay;
  const canUseEmailForward = caps.emailForward;
  const canUseAiReply = caps.aiAutoReply;
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
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(workspace?.autoReplyEnabled ?? false);
  const [autoReplyPrompt, setAutoReplyPrompt] = useState(workspace?.autoReplyPrompt ?? '');
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSmtpStatus().then((s) => setSmtpConfigured(s.smtpConfigured));
  }, []);

  if (!workspace) {
    return null;
  }

  function updateExtra(index: number, value: string) {
    setExtraRecipients((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function addExtra() {
    setExtraRecipients((prev) => [...prev, '']);
  }

  function removeExtra(index: number) {
    setExtraRecipients((prev) => prev.filter((_, i) => i !== index));
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
      autoReplyEnabled,
      autoReplyPrompt: autoReplyPrompt.trim(),
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSaved('Workspace settings saved successfully.');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">Settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Manage workspace setup</h1>
      </div>

      <form
        className="space-y-6 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm"
        onSubmit={handleSubmit}
      >
        {/* ─── WhatsApp connection ─── */}
        <section>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
            WhatsApp connection
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Business label</span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={businessLabel}
                onChange={(e) => setBusinessLabel(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Source WhatsApp number</span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={sourcePhoneNumber}
                onChange={(e) => setSourcePhoneNumber(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Phone number ID</span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Replace access token</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Replace app secret</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder={
                  workspace.appSecretConfigured
                    ? 'Leave blank to keep existing'
                    : 'Optional but recommended'
                }
              />
            </label>
          </div>
        </section>

        {/* ─── Forwarding destinations ─── */}
        <section className="border-t border-stone-200 pt-6">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
            Forwarding destinations
          </p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">
                Primary WhatsApp destination
              </span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={forwardToNumber}
                onChange={(e) => setForwardToNumber(e.target.value)}
                placeholder="15559876543"
                required
              />
              <span className="mt-1.5 block text-xs text-stone-400">
                Country code, no + sign. Required.
              </span>
            </label>

            <div>
              <span className="mb-2 block text-sm font-semibold text-stone-700">
                Extra WhatsApp destinations{' '}
                <span className="font-normal text-stone-400">(optional)</span>
              </span>
              <div className="space-y-2">
                {extraRecipients.map((value, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className="flex-1 rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                      value={value}
                      onChange={(e) => updateExtra(index, e.target.value)}
                      placeholder="15551234567"
                    />
                    <button
                      type="button"
                      onClick={() => removeExtra(index)}
                      className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-rose-300 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {canAddMoreDestinations ? (
                <button
                  type="button"
                  onClick={addExtra}
                  className="mt-3 rounded-full border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  + Add another number
                </button>
              ) : (
                <UpgradePrompt requiredPlan="Pro" feature="Multi-destination fan-out" />
              )}
              {canAddMoreDestinations && (
                <span className="mt-2 block text-xs text-stone-400">
                  Every inbound message is sent to every destination in parallel.
                </span>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">
                Webhook relay URL{' '}
                <span className="font-normal text-stone-400">(optional)</span>
              </span>
              <input
                type="url"
                disabled={!canUseWebhookRelay}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                value={canUseWebhookRelay ? webhookRelayUrl : ''}
                onChange={(e) => setWebhookRelayUrl(e.target.value)}
                placeholder="https://your-app.com/incoming"
              />
              {canUseWebhookRelay ? (
                <span className="mt-1.5 block text-xs text-stone-400">
                  POSTs a JSON payload of every inbound message to your URL. Use this to pipe
                  messages into your own backend, CRM, or automation tool.
                </span>
              ) : (
                <UpgradePrompt requiredPlan="Pro" feature="Webhook relay" />
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">
                Email forwarding address{' '}
                <span className="font-normal text-stone-400">(optional)</span>
              </span>
              <input
                type="email"
                disabled={!canUseEmailForward}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                value={canUseEmailForward ? emailForwardTo : ''}
                onChange={(e) => setEmailForwardTo(e.target.value)}
                placeholder="you@example.com"
              />
              {canUseEmailForward ? (
                <span className="mt-1.5 block text-xs text-stone-400">
                  Sends each forwarded message as an email — useful as a backup or for offline review.
                </span>
              ) : (
                <UpgradePrompt requiredPlan="Starter" feature="Email forwarding" />
              )}
              {canUseEmailForward && emailForwardTo.trim() && smtpConfigured === false && (
                <div className="mt-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  <strong>Email delivery is currently disabled.</strong> The server hasn't been
                  configured with SMTP credentials, so emails to <code>{emailForwardTo.trim()}</code> won't be sent.
                  Please contact your administrator.
                </div>
              )}
            </label>
          </div>
        </section>

        {/* ─── AI Auto-Reply ─── */}
        <section className="border-t border-stone-200 pt-6">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
            AI Auto-Reply
          </p>
          <div className="mt-4 space-y-4">
            {canUseAiReply ? (
              <>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-emerald-600"
                    checked={autoReplyEnabled}
                    onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-stone-700">Enable AI auto-reply</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    System prompt{' '}
                    <span className="font-normal text-stone-400">(optional)</span>
                  </span>
                  <textarea
                    rows={4}
                    disabled={!autoReplyEnabled}
                    className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                    value={autoReplyEnabled ? autoReplyPrompt : ''}
                    onChange={(e) => setAutoReplyPrompt(e.target.value)}
                    placeholder="You are a helpful assistant for Acme Corp. Answer questions about our products concisely."
                  />
                  <span className="mt-1.5 block text-xs text-stone-400">
                    Claude will reply to every inbound WhatsApp message using this prompt. Leave blank to use the default assistant persona.
                  </span>
                </label>
              </>
            ) : (
              <UpgradePrompt requiredPlan="Pro" feature="AI auto-reply" />
            )}
          </div>
        </section>

        {/* ─── Filters & toggle ─── */}
        <section className="border-t border-stone-200 pt-6">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
            Filters
          </p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Keyword filters</span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={keywordFilters}
                onChange={(e) => setKeywordFilters(e.target.value)}
                placeholder="urgent, invoice, vip"
              />
              <span className="mt-1.5 block text-xs text-stone-400">
                Comma-separated. Leave blank to forward every message.
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={forwardingEnabled}
                onChange={(e) => setForwardingEnabled(e.target.checked)}
                className="accent-emerald-700"
              />
              Forward incoming messages automatically
            </label>
          </div>
        </section>

        {saved ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {saved}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          disabled={saving}
          className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
        >
          {saving ? 'Saving changes...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
