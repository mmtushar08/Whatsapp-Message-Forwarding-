import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createRule, deleteRule, fetchRules, updateRule } from '../api/client';
import { useProduct } from '../context/ProductContext';
import type { ForwardingRule, ForwardingRuleInput } from '../types';
import { PLAN_CAPABILITIES } from '../types';

const EMPTY: ForwardingRuleInput = {
  name: '', forwardToNumber: '', extraRecipients: [],
  keywordFilters: '', forwardingEnabled: true, webhookRelayUrl: '', emailForwardTo: '',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

function RuleForm({ initial, onSave, onCancel, saving, error }: {
  initial: ForwardingRuleInput;
  onSave: (v: ForwardingRuleInput) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [f, setF] = useState(initial);
  const set = <K extends keyof ForwardingRuleInput>(k: K, v: ForwardingRuleInput[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); onSave(f); }} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Rule name">
          <input className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Sales inbox, VIP alerts..." required />
        </Field>
        <Field label="Forward to number" hint="Country code, no + sign.">
          <input className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600" value={f.forwardToNumber} onChange={(e) => set('forwardToNumber', e.target.value)} placeholder="15559876543" required />
        </Field>
      </div>
      <Field label="Keyword filters (optional)" hint="Comma-separated. Leave blank to match all messages.">
        <input className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600" value={f.keywordFilters} onChange={(e) => set('keywordFilters', e.target.value)} placeholder="urgent, invoice" />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Webhook relay URL (optional)">
          <input type="url" className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600" value={f.webhookRelayUrl} onChange={(e) => set('webhookRelayUrl', e.target.value)} placeholder="https://your-app.com/webhook" />
        </Field>
        <Field label="Email forwarding (optional)">
          <input type="email" className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600" value={f.emailForwardTo} onChange={(e) => set('emailForwardTo', e.target.value)} placeholder="you@example.com" />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        <input type="checkbox" checked={f.forwardingEnabled} onChange={(e) => set('forwardingEnabled', e.target.checked)} className="accent-emerald-700" />
        Enable this rule immediately
      </label>
      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold transition hover:border-stone-400">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60">{saving ? 'Saving...' : 'Save rule'}</button>
      </div>
    </form>
  );
}

function RuleCard({ rule, onEdit, onDelete, deleting }: { rule: ForwardingRule; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  return (
    <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-stone-900">{rule.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rule.forwardingEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
              {rule.forwardingEnabled ? 'Active' : 'Paused'}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            → <span className="font-mono">+{rule.forwardToNumber}</span>
            {rule.extraRecipients.length > 0 && <span className="ml-1 text-stone-400">+{rule.extraRecipients.length} more</span>}
          </p>
          {rule.keywordFilters.length > 0 && <p className="mt-1 text-xs text-stone-500">Keywords: {rule.keywordFilters.join(', ')}</p>}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {rule.webhookRelayUrl && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">Webhook relay</span>}
            {rule.emailForwardTo && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">Email: {rule.emailForwardTo}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={onEdit} className="rounded-full border border-stone-300 px-4 py-1.5 text-xs font-semibold transition hover:border-stone-400">Edit</button>
          <button onClick={onDelete} disabled={deleting} className="rounded-full border border-stone-300 px-4 py-1.5 text-xs font-semibold transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-40">{deleting ? '...' : 'Delete'}</button>
        </div>
      </div>
    </article>
  );
}

export default function Rules() {
  const { workspace, currentUser } = useProduct();
  const caps = PLAN_CAPABILITIES[currentUser?.plan ?? 'free'];
  const canAdd = caps.maxAdditionalRules !== 0;

  const [rules, setRules] = useState<ForwardingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ForwardingRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!workspace) return;
    fetchRules().then(setRules).finally(() => setLoading(false));
  }, [workspace]);

  if (!workspace) {
    return <div className="rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-sm"><p className="text-sm text-stone-600">Connect your WhatsApp number first.</p></div>;
  }

  async function handleSave(input: ForwardingRuleInput) {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = await updateRule(editing.id, input);
        setRules((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createRule(input);
        setRules((p) => [...p, created]);
      }
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteRule(id);
      setRules((p) => p.filter((r) => r.id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  const atLimit = caps.maxAdditionalRules !== -1 && rules.length >= caps.maxAdditionalRules;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">Forwarding</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Rules</h1>
          <p className="mt-2 text-sm text-stone-600">
            Additional rules run alongside your primary rule in{' '}
            <Link to="/app/settings" className="font-semibold text-emerald-700 hover:underline">Settings</Link>.
          </p>
        </div>
        {canAdd && !atLimit && !showForm && (
          <button onClick={() => { setShowForm(true); setEditing(null); setFormError(null); }} className="shrink-0 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">
            + Add rule
          </button>
        )}
      </div>

      {!canAdd && (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6">
          <p className="font-semibold text-stone-900">Multiple forwarding rules — Pro feature</p>
          <p className="mt-2 text-sm text-stone-600">Create up to 5 independent rules per workspace, each with its own destination, keyword filter, webhook relay, and email forward.</p>
          <Link to="/pricing" className="mt-4 inline-block rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">Upgrade to Pro →</Link>
        </div>
      )}

      {canAdd && atLimit && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {caps.label} plan limit reached.{' '}
          <Link to="/app/billing" className="font-semibold underline">Upgrade to Business</Link> for unlimited rules.
        </p>
      )}

      {showForm && (
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">{editing ? 'Edit rule' : 'New rule'}</p>
          <RuleForm
            initial={editing ? { name: editing.name, forwardToNumber: editing.forwardToNumber, extraRecipients: editing.extraRecipients, keywordFilters: editing.keywordFilters.join(', '), forwardingEnabled: editing.forwardingEnabled, webhookRelayUrl: editing.webhookRelayUrl, emailForwardTo: editing.emailForwardTo } : EMPTY}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); setFormError(null); }}
            saving={saving}
            error={formError}
          />
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[10vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-emerald-700" /></div>
      ) : rules.length === 0 ? (
        <div className="rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-stone-600">{canAdd ? 'No additional rules yet.' : 'Upgrade to Pro to add rules.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule}
              onEdit={() => { setEditing(rule); setShowForm(true); setFormError(null); }}
              onDelete={() => handleDelete(rule.id)}
              deleting={deletingId === rule.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
