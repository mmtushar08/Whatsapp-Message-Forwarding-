import type { MessageLog, Pagination } from '../types';
import StatusBadge from './StatusBadge';

interface MessageTableProps {
  messages: MessageLog[];
  pagination?: Pagination;
  onPageChange?: (offset: number) => void;
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function MessageTable({ messages, pagination, onPageChange }: MessageTableProps) {
  const hasPrev = pagination && pagination.offset > 0;
  const hasNext = pagination?.hasMore;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['ID', 'From', 'To', 'Message', 'Type', 'Status', 'Time'].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {messages.map((m, i) => (
              <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">{m.id}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-700">{m.from_number}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-700">{m.to_number}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs">{truncate(m.message, 60)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">{m.type}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={m.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatTime(m.forwarded_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && onPageChange && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
            {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.offset - pagination.limit)}
              disabled={!hasPrev}
              className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.offset + pagination.limit)}
              disabled={!hasNext}
              className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
