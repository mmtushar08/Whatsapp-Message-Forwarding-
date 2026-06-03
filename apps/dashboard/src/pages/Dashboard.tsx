import { Link } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

function SetupCard() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">Get started</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Welcome to WhatsApp Forwarder</h1>
        <p className="mt-2 text-sm text-stone-600">Connect your WhatsApp Business number to start forwarding messages.</p>
      </div>

      <section className="rounded-[2rem] border-2 border-dashed border-emerald-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-8 w-8 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-3.037-.476L3 21l1.785-4.619A8.903 8.903 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-stone-900">Connect your WhatsApp number</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-stone-600">
          You'll need your Meta Developer App credentials. Takes about 5 minutes — we'll guide you through each step.
        </p>
        <Link
          to="/onboarding"
          className="mt-6 inline-block rounded-full bg-emerald-700 px-8 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Connect WhatsApp →
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { step: '1', title: 'Connect WhatsApp', desc: 'Paste your Meta credentials — Phone Number ID, access token, app secret.' },
          { step: '2', title: 'Set forwarding rule', desc: 'Choose where messages go — a number, email, webhook, or all three.' },
          { step: '3', title: 'Paste webhook URL', desc: 'Copy your webhook URL into Meta Developer App and you\'re live.' },
        ].map((item) => (
          <article key={item.step} className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">{item.step}</div>
            <h3 className="mt-3 font-semibold text-stone-900">{item.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{item.desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export default function Dashboard() {
  const { currentUser, workspace, messages, stats } = useProduct();

  if (!workspace) {
    return <SetupCard />;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">Workspace</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-stone-900">{workspace.businessLabel}</h1>
            <p className="mt-3 text-sm text-stone-600">
              Signed in as {currentUser?.name}. Messages forwarded through this workspace are logged below.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-4 text-sm text-stone-700">
            <span className={`h-2 w-2 rounded-full ${workspace.forwardingEnabled ? 'bg-emerald-500' : 'bg-stone-400'}`} />
            <span className="font-semibold">{workspace.forwardingEnabled ? 'Forwarding active' : 'Forwarding paused'}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-stone-500">Total forwarded</div>
          <div className="mt-3 text-3xl font-bold text-stone-900">{stats.total}</div>
          <p className="mt-2 text-sm text-stone-600">All time messages</p>
        </article>
        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-stone-500">Success rate</div>
          <div className="mt-3 text-3xl font-bold text-emerald-700">
            {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100}%
          </div>
          <p className="mt-2 text-sm text-stone-600">{stats.success} succeeded · {stats.failed} failed</p>
        </article>
        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-stone-500">Destination</div>
          <div className="mt-3 text-xl font-bold text-stone-900">+{workspace.forwardToNumber}</div>
          <p className="mt-2 text-sm text-stone-600">
            {workspace.extraRecipients.length > 0 ? `+ ${workspace.extraRecipients.length} more` : 'Primary destination'}
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">Connection</p>
              <h2 className="mt-2 text-2xl font-bold text-stone-900">Meta webhook setup</h2>
            </div>
            <Link to="/app/settings" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900">
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
              <li>Go to WhatsApp → Configuration → Webhooks.</li>
              <li>Paste the webhook URL and verify token above, then click Verify.</li>
              <li>Subscribe to the <strong>messages</strong> field.</li>
            </ol>
          </div>
        </article>

        <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">Workspace rule</p>
          <h2 className="mt-2 text-2xl font-bold text-stone-900">Forwarding summary</h2>
          <dl className="mt-5 space-y-4 text-sm text-stone-700">
            <div>
              <dt className="font-semibold text-stone-900">Source number</dt>
              <dd className="mt-1">+{workspace.sourcePhoneNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-900">Primary destination</dt>
              <dd className="mt-1">+{workspace.forwardToNumber}</dd>
            </div>
            {workspace.extraRecipients.length > 0 && (
              <div>
                <dt className="font-semibold text-stone-900">Extra destinations</dt>
                <dd className="mt-1">{workspace.extraRecipients.map(n => `+${n}`).join(', ')}</dd>
              </div>
            )}
            <div>
              <dt className="font-semibold text-stone-900">Keyword filters</dt>
              <dd className="mt-1">{workspace.keywordFilters.length ? workspace.keywordFilters.join(', ') : 'All messages'}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">Recent activity</p>
            <h2 className="mt-2 text-2xl font-bold text-stone-900">Latest messages</h2>
          </div>
          <Link to="/app/messages" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900">
            View all
          </Link>
        </div>
        {messages.length === 0 ? (
          <p className="mt-5 text-sm text-stone-600">
            No messages yet. Once Meta webhook is verified and someone messages your WhatsApp number, activity will appear here.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {messages.slice(0, 5).map((message) => (
              <div key={message.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold">+{message.from} → +{message.to}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${message.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {message.status}
                  </span>
                </div>
                <div className="mt-2 truncate text-stone-600">{message.message}</div>
                <div className="mt-1 text-xs text-stone-400">{new Date(message.forwardedAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
