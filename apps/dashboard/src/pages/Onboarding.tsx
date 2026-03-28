import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const { workspace, saveWorkspace } = useProduct();
  const [businessLabel, setBusinessLabel] = useState(workspace?.businessLabel ?? '');
  const [sourcePhoneNumber, setSourcePhoneNumber] = useState(workspace?.sourcePhoneNumber ?? '');
  const [phoneNumberId, setPhoneNumberId] = useState(workspace?.phoneNumberId ?? '');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [forwardToNumber, setForwardToNumber] = useState(workspace?.forwardToNumber ?? '');
  const [keywordFilters, setKeywordFilters] = useState(workspace?.keywordFilters.join(', ') ?? '');
  const [forwardingEnabled, setForwardingEnabled] = useState(workspace?.forwardingEnabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    setBusinessLabel(workspace.businessLabel);
    setSourcePhoneNumber(workspace.sourcePhoneNumber);
    setPhoneNumberId(workspace.phoneNumberId);
    setForwardToNumber(workspace.forwardToNumber);
    setKeywordFilters(workspace.keywordFilters.join(', '));
    setForwardingEnabled(workspace.forwardingEnabled);
  }, [workspace]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    navigate('/app');
  }

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <section>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">
              Onboarding
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">
              Connect WhatsApp and define the forwarding rule
            </h1>
            <p className="mt-4 text-sm text-stone-600">
              This onboarding flow now saves workspace setup through the backend. The next backend
              step is making message logs and forwarding execution fully workspace-aware.
            </p>
            <ol className="mt-6 space-y-3 text-sm text-stone-600">
              <li>1. Enter the source WhatsApp business details.</li>
              <li>2. Enter the destination number for forwarded messages.</li>
              <li>3. Add optional keyword filters and save the workspace.</li>
              <li>4. Review the webhook instructions in the dashboard.</li>
            </ol>
          </section>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Business label</span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={businessLabel}
                onChange={(event) => setBusinessLabel(event.target.value)}
                placeholder="Acme Sales Inbox"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Source WhatsApp number</span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={sourcePhoneNumber}
                onChange={(event) => setSourcePhoneNumber(event.target.value)}
                placeholder="15551234567"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Phone number ID</span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={phoneNumberId}
                onChange={(event) => setPhoneNumberId(event.target.value)}
                placeholder="Meta phone number ID"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Access token</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder="Paste WhatsApp Cloud API token"
                required={!workspace}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">App secret</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={appSecret}
                onChange={(event) => setAppSecret(event.target.value)}
                placeholder="Optional but recommended for signature verification"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Forward to number</span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={forwardToNumber}
                onChange={(event) => setForwardToNumber(event.target.value)}
                placeholder="15559876543"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Keyword filters</span>
              <input
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={keywordFilters}
                onChange={(event) => setKeywordFilters(event.target.value)}
                placeholder="urgent, invoice, vip"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={forwardingEnabled}
                onChange={(event) => setForwardingEnabled(event.target.checked)}
              />
              Start with forwarding enabled
            </label>
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            <button className="w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">
              {saving ? 'Saving workspace...' : 'Save workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
