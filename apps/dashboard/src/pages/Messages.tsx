import { useEffect, useState } from 'react';
import { useProduct } from '../context/ProductContext';
import type { PrototypeMessageLog } from '../types';

type StatusFilter = 'all' | 'success' | 'failed';

export default function Messages() {
  const { workspace } = useProduct();
  const [messages, setMessages] = useState<PrototypeMessageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const limit = 20;

  async function load(s: string, status: StatusFilter, p: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(p * limit) });
      if (s) params.set('search', s);
      if (status !== 'all') params.set('status', status);
      const res = await fetch(
        `${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000'}/app/messages?${params}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('session_token')}` } }
      );
      const data = await res.json() as { data: PrototypeMessageLog[]; pagination: { total: number } };
      setMessages(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(search, statusFilter, page); }, []);

  function applySearch(value: string) {
    setSearch(value);
    setPage(0);
    void load(value, statusFilter, 0);
  }

  function applyStatus(value: StatusFilter) {
    setStatusFilter(value);
    setPage(0);
    void load(search, value, 0);
  }

  function goPage(p: number) {
    setPage(p);
    void load(search, statusFilter, p);
  }

  const totalPages = Math.ceil(total / limit);

  if (!workspace) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-stone-600">Connect your WhatsApp number first to see message logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">Logs</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Forwarding activity</h1>
        <p className="mt-2 text-sm text-stone-600">{total} total messages logged</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search by message, number..."
          value={search}
          onChange={e => applySearch(e.target.value)}
          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 sm:max-w-xs"
        />
        <div className="flex gap-2">
          {(['all', 'success', 'failed'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => applyStatus(s)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                statusFilter === s
                  ? s === 'failed' ? 'bg-rose-600 text-white' : 'bg-emerald-700 text-white'
                  : 'border border-stone-300 text-stone-700 hover:border-stone-400'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-emerald-700" />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-stone-600">
            {search || statusFilter !== 'all' ? 'No messages match your filters.' : 'No messages logged yet.'}
          </p>
          {(search || statusFilter !== 'all') && (
            <button onClick={() => { applySearch(''); applyStatus('all'); }} className="mt-3 text-sm font-semibold text-emerald-700 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-stone-500">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">From</th>
                <th className="px-6 py-4">To</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {messages.map((msg) => (
                <tr key={msg.id} className="text-sm text-stone-700 hover:bg-stone-50">
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      msg.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {msg.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">+{msg.from}</td>
                  <td className="px-6 py-4 font-mono text-xs">+{msg.to}</td>
                  <td className="max-w-xs px-6 py-4">
                    <div className="truncate">{msg.message}</div>
                    {msg.error && <div className="mt-1 text-xs text-rose-600">{msg.error}</div>}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-xs text-stone-500">
                    {new Date(msg.forwardedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-stone-200 px-6 py-4">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page === 0}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-sm text-stone-600">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => goPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
