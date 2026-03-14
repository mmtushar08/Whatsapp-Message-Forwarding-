import { useEffect, useState } from 'react';
import { fetchMessages } from '../api/client';
import type { MessageLog, Pagination } from '../types';
import MessageTable from '../components/MessageTable';

const LIMIT = 10;

export default function Messages() {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchMessages(LIMIT, offset)
      .then((res) => {
        setMessages(res.data);
        setPagination(res.pagination);
      })
      .catch(() => setError('Could not load messages. Is the server running?'))
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Message History</h1>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-500" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-8 text-center text-gray-500">
          No messages forwarded yet 📭
        </div>
      )}

      {!loading && !error && messages.length > 0 && pagination && (
        <MessageTable
          messages={messages}
          pagination={pagination}
          onPageChange={(newOffset) => setOffset(Math.max(0, newOffset))}
        />
      )}
    </div>
  );
}
