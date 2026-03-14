import { useEffect, useState } from 'react';
import { fetchStats, fetchMessages } from '../api/client';
import type { MessageStats, MessageLog } from '../types';
import StatCard from '../components/StatCard';
import MessageTable from '../components/MessageTable';

export default function Dashboard() {
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [recent, setRecent] = useState<MessageLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchMessages(5, 0)])
      .then(([s, m]) => {
        setStats(s);
        setRecent(m.data);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
        ⚠️ Could not load dashboard. Is the server running?
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-green-600">
          <span>✅</span> Forwarding is active
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Messages" value={stats.total} icon="📊" color="blue" />
          <StatCard title="Successful" value={stats.success} icon="✅" color="green" />
          <StatCard title="Failed" value={stats.failed} icon="❌" color="red" />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Recent Messages</h2>
        {recent.length === 0 ? (
          <p className="text-gray-500">No messages forwarded yet 📭</p>
        ) : (
          <MessageTable messages={recent} />
        )}
      </div>
    </div>
  );
}
