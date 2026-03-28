import { useProduct } from '../context/ProductContext';

export default function Messages() {
  const { messages, pagination, refreshWorkspaceData } = useProduct();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">Logs</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Forwarding activity</h1>
        <p className="mt-2 text-sm text-stone-600">
          These logs now come from the workspace-scoped backend message store.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600">
          {pagination ? `Total logged messages: ${pagination.total}` : 'Workspace log feed'}
        </p>
        <button
          type="button"
          onClick={() => {
            void refreshWorkspaceData();
          }}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900"
        >
          Refresh logs
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 text-sm text-stone-600 shadow-sm">
          No logged messages yet for this workspace.
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
            {messages.map((message) => (
              <tr key={message.id} className="text-sm text-stone-700">
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      message.status === 'success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {message.status}
                  </span>
                </td>
                <td className="px-6 py-4">{message.from}</td>
                <td className="px-6 py-4">{message.to}</td>
                <td className="px-6 py-4">
                  <div>{message.message}</div>
                  {message.error ? <div className="mt-1 text-xs text-rose-600">{message.error}</div> : null}
                </td>
                <td className="px-6 py-4">{new Date(message.forwardedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
