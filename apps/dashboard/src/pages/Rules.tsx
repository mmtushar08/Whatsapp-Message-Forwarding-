import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

interface DerivedRule {
  key: string;
  filter: string;
  dest: string;
  note: string;
}

function RouteRow({ rule }: { rule: DerivedRule }) {
  return (
    <div className="flex-1 min-w-[260px]">
      <div className="flex items-center gap-2.5">
        <div className="rounded-[14px_14px_14px_4px] px-3 py-2 text-sm" style={{ background: '#E4F6EC', border: '1px solid #BFE7D1' }}>
          {rule.filter}
        </div>
        <div className="flex-1 h-0.5 relative" style={{ backgroundImage: 'linear-gradient(90deg,#1FAB5E 55%,transparent 0)', backgroundSize: '9px 2px', minWidth: 36 }}>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 border-[5px] border-transparent border-l-[#1FAB5E]" />
        </div>
        <div className="rounded-[10px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap" style={{ border: '1.5px solid #DCE4DF' }}>
          {rule.dest}
        </div>
      </div>
      <div className="text-[12.5px] mt-1.5" style={{ color: '#5C6B63' }}>{rule.note}</div>
    </div>
  );
}

export default function Rules() {
  const { workspace, saveWorkspace } = useProduct();
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!workspace) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Forwarding rules</h1>
        <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>Connect WhatsApp first to create forwarding rules.</p>
        <Link to="/onboarding" className="inline-block rounded-[11px] px-6 py-3 text-sm font-semibold text-white no-underline" style={{ background: '#1FAB5E' }}>
          Connect WhatsApp →
        </Link>
      </div>
    );
  }

  const filterLabel = workspace.keywordFilters.length > 0
    ? `Contains "${workspace.keywordFilters.join(', ')}"`
    : 'All messages';
  const sourceLabel = workspace.sourcePhoneNumber || workspace.phoneNumberId;

  const rules: DerivedRule[] = [];
  if (workspace.forwardToNumber) {
    rules.push({
      key: 'primary',
      filter: filterLabel,
      dest: `📱 +${workspace.forwardToNumber}`,
      note: `From ${sourceLabel} · primary destination`,
    });
  }
  workspace.extraRecipients.forEach((number, i) => {
    rules.push({
      key: `extra-${i}`,
      filter: filterLabel,
      dest: `📱 +${number}`,
      note: `From ${sourceLabel} · fan-out destination`,
    });
  });
  if (workspace.webhookRelayUrl) {
    rules.push({
      key: 'webhook',
      filter: 'All messages',
      dest: `⚙️ POST ${workspace.webhookRelayUrl}`,
      note: `From ${sourceLabel} · JSON payload`,
    });
  }
  if (workspace.emailForwardTo) {
    rules.push({
      key: 'email',
      filter: 'All messages',
      dest: `✉️ ${workspace.emailForwardTo}`,
      note: `From ${sourceLabel} · email copy`,
    });
  }

  const setupIncomplete = !workspace.sourcePhoneNumber || !workspace.forwardToNumber;

  async function handleToggle() {
    if (!workspace) return;
    setToggling(true);
    setError(null);
    const result = await saveWorkspace({
      businessLabel: workspace.businessLabel,
      sourcePhoneNumber: workspace.sourcePhoneNumber,
      phoneNumberId: workspace.phoneNumberId,
      accessToken: '',
      appSecret: '',
      forwardToNumber: workspace.forwardToNumber,
      extraRecipients: workspace.extraRecipients,
      keywordFilters: workspace.keywordFilters.join(', '),
      forwardingEnabled: !workspace.forwardingEnabled,
      webhookRelayUrl: workspace.webhookRelayUrl,
      emailForwardTo: workspace.emailForwardTo,
    });
    setToggling(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight" style={{ color: '#14201B' }}>Forwarding rules</h1>
          <p className="text-sm" style={{ color: '#5C6B63' }}>
            Rules are derived from your workspace settings. A message can match more than one destination.
          </p>
        </div>
        <Link to="/app/settings"
          className="rounded-[11px] px-4 py-2 text-sm font-semibold text-white no-underline"
          style={{ background: '#1FAB5E' }}>
          + New rule
        </Link>
      </div>

      {error && (
        <div className="rounded-[10px] px-4 py-3 text-sm" style={{ background: '#FBE3E2', border: '1px solid #F0CBC9', color: '#A03330' }}>
          {error}
        </div>
      )}

      {setupIncomplete ? (
        <div className="bg-white rounded-[14px] p-8 text-center" style={{ border: '2px dashed #DCE4DF' }}>
          <p className="font-semibold mb-1" style={{ color: '#14201B' }}>Almost there</p>
          <p className="text-sm mb-5" style={{ color: '#5C6B63' }}>
            Add your source number and a forwarding destination in Settings to activate your first rule.
          </p>
          <Link to="/app/settings" className="inline-block rounded-[11px] px-6 py-3 text-sm font-semibold text-white no-underline" style={{ background: '#1FAB5E' }}>
            Complete setup →
          </Link>
        </div>
      ) : (
        <>
          {/* Master toggle */}
          <div className="bg-white rounded-[14px] p-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#14201B' }}>Forwarding {workspace.forwardingEnabled ? 'enabled' : 'paused'}</div>
              <div className="text-[12.5px]" style={{ color: '#5C6B63' }}>
                {workspace.forwardingEnabled
                  ? 'Incoming messages are forwarded to every destination below.'
                  : 'Incoming messages are received but not forwarded.'}
              </div>
            </div>
            <button
              type="button"
              aria-label="Toggle forwarding"
              disabled={toggling}
              onClick={handleToggle}
              className="relative w-10 h-[22px] rounded-full border-none shrink-0 transition-colors disabled:opacity-50"
              style={{ background: workspace.forwardingEnabled ? '#1FAB5E' : '#CBD6CF' }}
            >
              <span className="absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: workspace.forwardingEnabled ? 21 : 3 }} />
            </button>
          </div>

          <div className="bg-white rounded-[14px] p-5" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
            {rules.map((rule, i) => (
              <div key={rule.key} className="flex items-center gap-3.5 py-4 flex-wrap"
                style={{ borderBottom: i < rules.length - 1 ? '1px solid #EDF1EE' : undefined, opacity: workspace.forwardingEnabled ? 1 : 0.5 }}>
                <RouteRow rule={rule} />
                <Link to="/app/settings"
                  className="rounded-[9px] px-3 py-1.5 text-sm font-semibold border no-underline"
                  style={{ borderColor: '#DCE4DF', color: '#14201B' }}>
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
