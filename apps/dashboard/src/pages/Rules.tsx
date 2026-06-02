import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createRule,
  deleteRule,
  fetchRules,
  updateRule,
} from '../api/client';
import { useProduct } from '../context/ProductContext';
import type { ForwardingRule, ForwardingRuleInput } from '../types';
import { PLAN_CAPABILITIES } from '../types';

const EMPTY_INPUT: ForwardingRuleInput = {
  name: '',
  forwardToNumber: '',
  extraRecipients: [],
  keywordFilters: '',
  forwardingEnabled: true,
  webhookRelayUrl: '',
  emailForwardTo: '',
};

function RuleForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: ForwardingRuleInput;
  onSave: (input: ForwardingRuleInput) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<ForwardingRuleInput>(initial);

  function set<K extends keyof ForwardingRuleInput>(key: K, value: ForwardingRuleInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-stone-700">Rule name</span>
          <input
            className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Sales inbox, VIP alerts..."
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-stone-700">Forward to number</span>
          <input
            className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            value={form.forwardToNumber}
            onChange={(e) => set('forwardToNumber', e.target.value)}
            placeholder="15559876543"
            required
          />
          <span className="mt-1 block text-xs text-stone-400">Country code, no + sign.</span>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-stone-700">
          Keyword filters <span className="font-normal text-stone-400">(optional)</span>
        </span>
        <input
          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600"
          value={form.keywordFilters}
          onChange={(e) => set('keywordFilters', e.target.value)}
          placeholder="urgent, invoice, vip"
        />
        <span className="mt-1 block text-xs text-stone-400">
          Comma-separated. Only matching messages trigger this rule. Leave blank for all messages.
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-stone-700">
            Webhook relay URL <span className="font-normal text-stone-400">(optional)</span>
          </span>
          <input
            type="url"
            className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            value={form.webhookRelayUrl}
            onChange={(e) => set('webhookRelayUrl', e.target.value)}
            placeholder="https://your-app.com/webhook"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-stone-700">
            Email forwarding <span className="font-normal text-stone-400">(optional)</span>
          </span>
          <input
            type="email"
            className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            value={form.emailForwardTo}
            onChange={(e) => set('emailForwardTo', e.target.value)}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={form.forwardingEnabled}
          onChange={(e) => set('forwardingEnabled', e.target.checked)}
          className="accent-emerald-700"
        />
        Enable this rule immediately
      </label>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save rule'}
        </button>
      </div>
    </form>
  );
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
  deleting,
}: {
  rule: ForwardingRule;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-stone-900">{rule.name}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                rule.forwardingEnabled
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {rule.forwardingEnabled ? 'Active' : 'Paused'}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            → <span className="font-mono">+{rule.forwardToNumber}</span>
            {rule.extraRecipients.length > 0 && (
              <span className="ml-1 text-stone-400">+ {rule.extraRecipients.length} more</span>
            )}
          </p>
          {rule.keywordFilters.length > 0 && (
            <p className="mt-1 text-xs text-stone-500">
              Keywords: {rule.keywordFilters.join(', ')}
            </p>
          )}
          {(rule.webhookRelayUrl || rule.emailForwardTo) && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {rule.webhookRelayUrl && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  Webhook relay
                </span>
              )}
              {rule.emailForwardTo && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  Email: {rule.emailForwardTo}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onEdit}
            className="rounded-full border border-stone-300 px-4 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-stone-400"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-full border border-stone-300 px-4 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-40"
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Rules() {
  const { workspace, currentUser } = useProduct();
  const plan = currentUser?.plan ?? 'free';
  const caps = PLAN_CAPABILITIES[plan];
  const canAddRules = caps.maxAdditionalRules !== 0;

  const [rules, setRules] = useState<ForwardingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ForwardingRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!workspace) return;
    fetchRules()
      .then(setRules)
      .finally(() => setLoading(false));
  }, [workspace]);

  if (!workspace) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-stone-600">Connect your WhatsApp number first.</p>
      </div>
    );
  }

  async function handleSave(input: ForwardingRuleInput) {
    setSaving(true);
    setFormError(null);
    try {
      if (editingRule) {
        const updated = await updateRule(editingRule.id, input);
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createRule(input);
        setRules((prev) => [...prev, created]);
      }
      setShowForm(false);
      setEditingRule(null);
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
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(rule: ForwardingRule) {
    setEditingRule(rule);
    setShowForm(true);
    setFormError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingRule(null);
    setFormError(null);
  }

  const atLimit =
    caps.maxAdditionalRules !== -1 && rules.length >= caps.maxAdditionalRules;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">
            Forwarding
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Rules</h1>
          <p className="mt-2 text-sm text-stone-600">
            Additional rules run alongside your primary forwarding setup in{' '}
            <Link to="/app/settings" className="font-semibold text-emerald-700 hover:underline">
              Settings
            </Link>
            .
          </p>
        </div>
        {!showForm && canAddRules && !atLimit && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingRule(null);
              setFormError(null);
            }}
            className="shrink-0 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            + Add rule
          </button>
        )}
      </div>

      {/* Plan upgrade prompt */}
      {!canAddRules && (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="font-semibold text-stone-900">Multiple forwarding rules — Pro feature</p>
          <p className="mt-2 text-sm text-stone-600">
            Create up to 5 independent rules per workspace, each with their own destination,
            keyword filter, webhook relay, and email forward.
          </p>
          <Link
            to="/pricing"
            className="mt-4 inline-block rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Upgrade to Pro →
          </Link>
        </div>
      )}

      {/* At limit prompt */}
      {canAddRules && atLimit && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You've reached the {caps.maxAdditionalRules}-rule limit on the {caps.label} plan.{' '}
          <Link to="/app/billing" className="font-semibold underline">
            Upgrade to Business
          </Link>{' '}
          for unlimited rules.
        </div>
      )}

      {/* New/edit form */}
      {showForm && (
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">
            {editingRule ? 'Edit rule' : 'New rule'}
          </p>
          <RuleForm
            initial={
              editingRule
                ? {
                    name: editingRule.name,
                    forwardToNumber: editingRule.forwardToNumber,
                    extraRecipients: editingRule.extraRecipients,
                    keywordFilters: editingRule.keywordFilters.join(', '),
                    forwardingEnabled: editingRule.forwardingEnabled,
                    webhookRelayUrl: editingRule.webhookRelayUrl,
                    emailForwardTo: editingRule.emailForwardTo,
                  }
                : EMPTY_INPUT
            }
            onSave={handleSave}
            onCancel={cancelForm}
            saving={saving}
            error={formError}
          />
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="flex min-h-[12vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-emerald-700" />
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-stone-600">
            {canAddRules
              ? 'No additional rules yet. Add one to fan-out messages to multiple destinations independently.'
              : 'Upgrade to Pro to add additional forwarding rules.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => startEdit(rule)}
              onDelete={() => handleDelete(rule.id)}
              deleting={deletingId === rule.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
