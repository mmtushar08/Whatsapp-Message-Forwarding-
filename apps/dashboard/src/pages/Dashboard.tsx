import { useState } from 'react';
import { Link } from 'react-router-dom';
import { seedDemoData } from '../api/client';
import { SetupWarnings } from '../components/ConnectionNotices';
import { useProduct } from '../context/ProductContext';
import { useLiveRefresh } from '../lib/useLiveRefresh';
import { formatDestination, formatPhone, hasDestination } from '../lib/workspace';

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-white rounded-[14px] px-5 py-4" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.13em] mb-2" style={{ color: '#5C6B63' }}>{label}</div>
      <div className="text-[28px] font-extrabold tracking-tight font-mono" style={{ color: '#14201B' }}>{value}</div>
      <div className="text-xs mt-1.5" style={{ color: '#5C6B63' }}>{detail}</div>
    </div>
  );
}

type BadgeColor = 'green' | 'red';
const BADGE: Record<BadgeColor, { bg: string; color: string }> = {
  green: { bg: '#E4F6EC', color: '#11713E' },
  red:   { bg: '#FBE3E2', color: '#A03330' },
};

export default function Dashboard() {
  const { currentUser, workspace, stats, messages, refreshWorkspaceData } = useProduct();
  const [seeding, setSeeding] = useState(false);
  useLiveRefresh(refreshWorkspaceData, { enabled: Boolean(workspace) });

  if (!workspace) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="rounded-[14px] p-8" style={{ background: '#E4F6EC', border: '1px solid #BFE7D1' }}>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.13em] mb-2" style={{ color: '#168B4B' }}>Setup required</div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: '#14201B' }}>
            Welcome, {currentUser?.name}!
          </h1>
          <p className="text-sm mb-5" style={{ color: '#5C6B63' }}>
            Connect your WhatsApp Business Account to start forwarding messages. It only takes a couple of minutes.
          </p>
          <Link
            to="/onboarding"
            className="inline-block rounded-[11px] px-6 py-3 text-sm font-semibold text-white no-underline"
            style={{ background: '#1FAB5E' }}
          >
            Connect WhatsApp →
          </Link>
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
          {['Messages received', 'Forwarded', 'Failed', 'Monthly usage'].map((label) => (
            <div key={label} className="bg-white rounded-[14px] px-5 py-4" style={{ border: '1px solid #DCE4DF' }}>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.13em] mb-2" style={{ color: '#5C6B63' }}>{label}</div>
              <div className="text-[28px] font-extrabold font-mono" style={{ color: '#DCE4DF' }}>—</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const deliveryRate = stats.total > 0 ? `${((stats.success / stats.total) * 100).toFixed(1)}% delivery rate` : 'No messages yet';
  const usageDetail = stats.monthlyLimit && stats.monthlyLimit !== -1
    ? `of ${stats.monthlyLimit.toLocaleString()} this month`
    : 'unlimited plan';
  const feed = messages.slice(0, 5);

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedDemoData();
      await refreshWorkspaceData();
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight" style={{ color: '#14201B' }}>Dashboard</h1>
          <p className="text-sm" style={{ color: '#5C6B63' }}>
            {workspace.businessLabel} · <span className="font-mono">{formatPhone(workspace.sourcePhoneNumber) || workspace.phoneNumberId}</span>
          </p>
        </div>
        <Link
          to="/app/rules"
          className="rounded-[11px] px-4 py-2 text-sm font-semibold text-white no-underline"
          style={{ background: '#1FAB5E' }}
        >
          + New rule
        </Link>
      </div>

      {(workspace.status === 'needs_webhook_setup' || !hasDestination(workspace)) && (
        <div className="rounded-[10px] px-4 py-3 text-sm flex flex-wrap justify-between items-center gap-3"
          style={{ background: '#FBF0DC', border: '1px solid #E8A23D', color: '#6B4A10' }}>
          <span>
            {workspace.status === 'needs_webhook_setup'
              ? <><strong>Waiting for Meta:</strong> point your Meta app's webhook at us to start receiving messages.</>
              : <><strong>Nothing is being forwarded yet:</strong> add a destination for incoming messages.</>}
          </span>
          <Link to={workspace.status === 'needs_webhook_setup' ? '/app/numbers' : '/app/settings'}
            className="font-semibold underline" style={{ color: '#6B4A10' }}>
            {workspace.status === 'needs_webhook_setup' ? 'See webhook details →' : 'Add a destination →'}
          </Link>
        </div>
      )}
      <SetupWarnings workspace={workspace} />

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
        <StatCard label="Messages received" value={(stats.received ?? stats.total).toLocaleString()} detail={workspace.forwardingEnabled ? 'forwarding active' : 'forwarding paused'} />
        <StatCard label="Forwarded" value={stats.success.toLocaleString()} detail={deliveryRate} />
        <StatCard label="Failed" value={stats.failed.toLocaleString()} detail={stats.failed > 0 ? 'check message logs' : 'all clear'} />
        <StatCard label="Monthly usage" value={(stats.monthlyUsage ?? 0).toLocaleString()} detail={usageDetail} />
      </div>

      <div className="bg-white rounded-[14px] p-5" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold tracking-tight" style={{ color: '#14201B' }}>Live forwarding feed</h2>
          <button
            type="button"
            onClick={() => void refreshWorkspaceData()}
            className="rounded-[9px] px-3 py-1.5 text-sm font-semibold border"
            style={{ borderColor: '#DCE4DF', color: '#14201B' }}
          >
            Refresh
          </button>
        </div>

        {feed.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm mb-4" style={{ color: '#5C6B63' }}>
              No forwarded messages yet. Send a WhatsApp message to {formatPhone(workspace.sourcePhoneNumber) || 'your business number'} to see it here.
            </p>
            {import.meta.env.DEV && (
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeed}
                className="rounded-[9px] px-4 py-2 text-sm font-semibold border disabled:opacity-50"
                style={{ borderColor: '#1FAB5E', color: '#168B4B' }}
              >
                {seeding ? 'Seeding…' : 'Seed demo data (dev only)'}
              </button>
            )}
          </div>
        ) : (
          feed.map((item, i) => {
            const ok = item.status === 'success';
            const badge = BADGE[ok ? 'green' : 'red'];
            return (
              <div key={item.id} className="flex items-center gap-3.5 py-3 flex-wrap"
                style={{ borderBottom: i < feed.length - 1 ? '1px solid #EDF1EE' : undefined }}>
                <span className="font-mono text-[11.5px] w-12 shrink-0" style={{ color: '#5C6B63' }}>
                  {new Date(item.forwardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex items-center gap-2.5 flex-1 min-w-0 basis-full sm:basis-auto">
                  <div className="rounded-[14px_14px_14px_4px] px-3 py-2 text-sm flex-1 sm:flex-none min-w-0 sm:max-w-[220px] truncate"
                    style={{ background: '#E4F6EC', border: '1px solid #BFE7D1' }}>
                    {item.message}
                  </div>
                  <div className="hidden sm:block flex-1 h-0.5 relative"
                    style={{ backgroundImage: 'linear-gradient(90deg,#1FAB5E 55%,transparent 0)', backgroundSize: '9px 2px', minWidth: 36 }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 border-[5px] border-transparent border-l-[#1FAB5E]" />
                  </div>
                  <div className="rounded-[10px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 font-mono max-w-[50%] truncate"
                    style={{ border: '1.5px solid #DCE4DF' }}>
                    {formatDestination(item.channel, item.to)}
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full px-3 py-0.5 text-[11.5px] font-bold" style={badge}>
                  {ok ? 'Delivered' : 'Failed'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
