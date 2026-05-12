import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cancelSubscription,
  fetchBillingStatus,
  startSubscription,
} from '../api/client';
import { useProduct } from '../context/ProductContext';
import type { BillingStatus, PlanTier } from '../types';

const TIER_PRICES: Record<Exclude<PlanTier, 'free'>, { price: string; label: string }> = {
  starter: { price: '$9 / month', label: 'Starter' },
  pro: { price: '$19 / month', label: 'Pro' },
  business: { price: '$39 / month', label: 'Business' },
};

export default function Billing() {
  const { stats } = useProduct();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setStatus(await fetchBillingStatus());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleSubscribe(plan: 'starter' | 'pro' | 'business') {
    setBusy(true);
    setError(null);
    try {
      const r = await startSubscription(plan);
      window.location.href = r.shortUrl;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    setError(null);
    try {
      await cancelSubscription();
      setConfirmCancel(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-full border-4 border-stone-200 border-t-emerald-700 h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Could not load billing status. {error}
      </div>
    );
  }

  const isPaidPlan = status.plan !== 'free';
  const monthlyUsage = stats.monthlyUsage ?? 0;
  const monthlyLimit = stats.monthlyLimit ?? -1;
  const usagePct =
    monthlyLimit === -1 ? 0 : Math.min(100, Math.round((monthlyUsage / monthlyLimit) * 100));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">Billing</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Plan & subscription</h1>
      </div>

      {/* Current plan card */}
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
              Current plan
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {status.limits.label}
            </h2>
            {status.planExpiresAt && isPaidPlan && (
              <p className="mt-1 text-sm text-stone-600">
                Renews {new Date(status.planExpiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {!isPaidPlan && (
              <Link
                to="/pricing"
                className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                See plans
              </Link>
            )}
            {isPaidPlan &&
              (confirmCancel ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={busy}
                    className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    {busy ? 'Cancelling...' : 'Confirm cancel'}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-900"
                  >
                    Keep plan
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-rose-300 hover:text-rose-600"
                >
                  Cancel subscription
                </button>
              ))}
          </div>
        </div>

        {/* Usage bar */}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-stone-700">This month's usage</span>
            <span className="text-stone-600">
              {monthlyUsage}{' '}
              {monthlyLimit === -1 ? 'messages (unlimited)' : `/ ${monthlyLimit} messages`}
            </span>
          </div>
          {monthlyLimit !== -1 && (
            <div className="mt-3 h-2 w-full rounded-full bg-stone-200">
              <div
                className={`h-2 rounded-full transition-all ${
                  usagePct >= 90 ? 'bg-rose-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-emerald-700'
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
          {monthlyLimit !== -1 && usagePct >= 80 && (
            <p className="mt-3 text-xs text-amber-700">
              You've used {usagePct}% of your monthly cap.{' '}
              <Link to="/pricing" className="font-semibold underline">
                Upgrade for unlimited messages
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {/* Upgrade options (only when on free) */}
      {!isPaidPlan && (
        <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">
            Upgrade
          </p>
          <h2 className="mt-2 text-2xl font-bold text-stone-900">Pick a plan to unlock more</h2>
          <p className="mt-2 text-sm text-stone-600">
            Upgrade unlocks unlimited messages, multi-destination fan-out, webhook relay, and more.
          </p>

          {!status.razorpayConfigured && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Billing is not yet configured on this server. Please contact your administrator to
              enable upgrades.
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(['starter', 'pro', 'business'] as const).map((tier) => (
              <article
                key={tier}
                className={`rounded-2xl border p-5 ${
                  tier === 'pro'
                    ? 'border-emerald-700 bg-emerald-50/40'
                    : 'border-stone-200 bg-stone-50'
                }`}
              >
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">
                  {TIER_PRICES[tier].label}
                </p>
                <p className="mt-2 text-xl font-bold text-stone-900">{TIER_PRICES[tier].price}</p>
                <button
                  onClick={() => handleSubscribe(tier)}
                  disabled={busy || !status.razorpayConfigured}
                  className={`mt-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                    tier === 'pro'
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'border border-stone-300 text-stone-900 hover:border-stone-400'
                  }`}
                >
                  {busy ? 'Redirecting...' : `Subscribe to ${TIER_PRICES[tier].label}`}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <p className="text-xs text-stone-500">
        Payments processed securely by Razorpay. Cancel any time — no commitment.
      </p>
    </div>
  );
}
