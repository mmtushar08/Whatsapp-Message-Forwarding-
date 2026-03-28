import { Link } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

export default function Dashboard() {
  const { currentUser, workspace, messages, stats } = useProduct();

  if (!workspace) {
    return null;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">Workspace</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-stone-900">{workspace.businessLabel}</h1>
            <p className="mt-3 text-sm text-stone-600">
              Signed in as {currentUser?.name}. This is the hosted web flow prototype for account
              creation, onboarding, and browser-managed forwarding.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-4 text-sm text-stone-700">
            <div className="font-semibold">Webhook status</div>
            <div className="mt-1">
              {workspace.status === 'needs_webhook_setup' ? 'Needs Meta setup' : workspace.status}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-stone-500">Forwarding</div>
          <div className="mt-3 text-3xl font-bold text-stone-900">
            {workspace.forwardingEnabled ? 'Enabled' : 'Paused'}
          </div>
          <p className="mt-2 text-sm text-stone-600">Destination: {workspace.forwardToNumber}</p>
        </article>
        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-stone-500">Recent successes</div>
          <div className="mt-3 text-3xl font-bold text-stone-900">{stats.success}</div>
          <p className="mt-2 text-sm text-stone-600">Real workspace-scoped log stats from the backend</p>
        </article>
        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-stone-500">Recent failures</div>
          <div className="mt-3 text-3xl font-bold text-stone-900">{stats.failed}</div>
          <p className="mt-2 text-sm text-stone-600">Backed by the new workspace-scoped message table</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">
                Connection
              </p>
              <h2 className="mt-2 text-2xl font-bold text-stone-900">Meta webhook setup</h2>
            </div>
            <Link
              to="/app/settings"
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900"
            >
              Edit setup
            </Link>
          </div>
          <div className="mt-5 space-y-4 text-sm text-stone-700">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="font-semibold">Webhook URL</div>
              <div className="mt-1 break-all text-stone-600">{workspace.webhookUrl}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="font-semibold">Verify token</div>
              <div className="mt-1 break-all text-stone-600">{workspace.webhookVerifyToken}</div>
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-stone-600">
              <li>Open your Meta Developer App.</li>
              <li>Go to WhatsApp webhook settings.</li>
              <li>Paste the webhook URL and verify token above.</li>
              <li>Subscribe to message events, then test forwarding.</li>
            </ol>
          </div>
        </article>

        <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">
            Workspace rule
          </p>
          <h2 className="mt-2 text-2xl font-bold text-stone-900">Forwarding summary</h2>
          <dl className="mt-5 space-y-4 text-sm text-stone-700">
            <div>
              <dt className="font-semibold text-stone-900">Source number</dt>
              <dd className="mt-1">{workspace.sourcePhoneNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-900">Phone number ID</dt>
              <dd className="mt-1">{workspace.phoneNumberId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-900">Destination number</dt>
              <dd className="mt-1">{workspace.forwardToNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-900">Filters</dt>
              <dd className="mt-1">
                {workspace.keywordFilters.length ? workspace.keywordFilters.join(', ') : 'All messages'}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">
              Recent activity
            </p>
            <h2 className="mt-2 text-2xl font-bold text-stone-900">Latest workspace messages</h2>
          </div>
          <Link
            to="/app/messages"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900"
          >
            View all
          </Link>
        </div>
        {messages.length === 0 ? (
          <p className="mt-5 text-sm text-stone-600">
            No messages have been logged for this workspace yet. Once forwarding starts, activity
            will appear here automatically.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {messages.slice(0, 3).map((message) => (
              <div
                key={message.id}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold">
                    {message.from}
                    {' -> '}
                    {message.to}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      message.status === 'success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {message.status}
                  </span>
                </div>
                <div className="mt-2">{message.message}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
