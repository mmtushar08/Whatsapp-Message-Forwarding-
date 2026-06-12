import { useState } from 'react';
import { seedDemoData } from '../api/client';
import { useProduct } from '../context/ProductContext';

type BadgeColor = 'green' | 'red';
const BADGE: Record<BadgeColor, { bg: string; color: string }> = {
  green: { bg: '#E4F6EC', color: '#11713E' },
  red:   { bg: '#FBE3E2', color: '#A03330' },
};

export default function Messages() {
  const { workspace, messages, pagination, refreshWorkspaceData } = useProduct();
  const [seeding, setSeeding] = useState(false);

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
    <div className="max-w-5xl space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight" style={{ color: '#14201B' }}>Message logs</h1>
          <p className="text-sm" style={{ color: '#5C6B63' }}>
            Every inbound message and where it went.{pagination ? ` Total: ${pagination.total}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshWorkspaceData()}
          className="rounded-[11px] px-4 py-2 text-sm font-semibold border"
          style={{ borderColor: '#DCE4DF', color: '#14201B' }}
        >
          Refresh logs
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="bg-white rounded-[14px] p-10 text-center" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
          <p className="text-sm mb-4" style={{ color: '#5C6B63' }}>
            {workspace
              ? 'No logged messages yet for this workspace. Send a WhatsApp message to your business number to see it here.'
              : 'Connect WhatsApp to start logging forwarded messages.'}
          </p>
          {workspace && import.meta.env.DEV && (
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
        <div className="bg-white rounded-[14px] overflow-auto" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {['Time', 'From', 'To', 'Message', 'Status'].map((h) => (
                  <th key={h} className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-left px-4 py-3"
                    style={{ color: '#5C6B63', borderBottom: '1.5px solid #DCE4DF' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messages.map((row) => {
                const ok = row.status === 'success';
                const badge = BADGE[ok ? 'green' : 'red'];
                return (
                  <tr key={row.id} className="hover:bg-[#FAFCFA]">
                    <td className="font-mono px-4 py-3 whitespace-nowrap" style={{ color: '#14201B', borderBottom: '1px solid #EDF1EE' }}>
                      {new Date(row.forwardedAt).toLocaleString()}
                    </td>
                    <td className="font-mono px-4 py-3 whitespace-nowrap" style={{ color: '#5C6B63', borderBottom: '1px solid #EDF1EE' }}>
                      +{row.from}
                    </td>
                    <td className="font-mono px-4 py-3 whitespace-nowrap" style={{ color: '#5C6B63', borderBottom: '1px solid #EDF1EE' }}>
                      +{row.to}
                    </td>
                    <td className="px-4 py-3 max-w-[260px]" style={{ color: '#14201B', borderBottom: '1px solid #EDF1EE' }}>
                      <div className="truncate">{row.message}</div>
                      {row.error && <div className="mt-1 text-xs" style={{ color: '#A03330' }}>{row.error}</div>}
                    </td>
                    <td className="px-4 py-3" style={{ borderBottom: '1px solid #EDF1EE' }}>
                      <span className="inline-flex items-center rounded-full px-3 py-0.5 text-[11.5px] font-bold" style={badge}>
                        {ok ? 'Delivered' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
