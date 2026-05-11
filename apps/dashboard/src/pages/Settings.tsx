import { FormEvent, useState } from 'react';
import { useProduct } from '../context/ProductContext';

export default function Settings() {
  const { workspace, saveWorkspace } = useProduct();
  const [businessLabel, setBusinessLabel] = useState(workspace?.businessLabel ?? '');
  const [sourcePhoneNumber, setSourcePhoneNumber] = useState(workspace?.sourcePhoneNumber ?? '');
  const [phoneNumberId, setPhoneNumberId] = useState(workspace?.phoneNumberId ?? '');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [forwardToNumber, setForwardToNumber] = useState(workspace?.forwardToNumber ?? '');
  const [keywordFilters, setKeywordFilters] = useState(workspace?.keywordFilters.join(', ') ?? '');
  const [forwardingEnabled, setForwardingEnabled] = useState(workspace?.forwardingEnabled ?? true);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!workspace) {
    return null;
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
      keywordFilters,
      forwardingEnabled,
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
        className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Business label</span>
            <input
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={businessLabel}
              onChange={(event) => setBusinessLabel(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Source WhatsApp number</span>
            <input
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={sourcePhoneNumber}
              onChange={(event) => setSourcePhoneNumber(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Phone number ID</span>
            <input
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={phoneNumberId}
              onChange={(event) => setPhoneNumberId(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Replace access token</span>
            <input
              type="password"
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder="Leave blank to keep current preview"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Replace app secret</span>
            <input
              type="password"
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={appSecret}
              onChange={(event) => setAppSecret(event.target.value)}
              placeholder={
                workspace.appSecretConfigured
                  ? 'Leave blank to keep the current app secret'
                  : 'Optional but recommended'
              }
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Forward to number</span>
            <input
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={forwardToNumber}
              onChange={(event) => setForwardToNumber(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Keyword filters</span>
            <input
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={keywordFilters}
              onChange={(event) => setKeywordFilters(event.target.value)}
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={forwardingEnabled}
            onChange={(event) => setForwardingEnabled(event.target.checked)}
          />
          Forward incoming messages automatically
        </label>

        {saved ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {saved}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          disabled={saving}
          className="mt-6 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
        >
          {saving ? 'Saving changes...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
