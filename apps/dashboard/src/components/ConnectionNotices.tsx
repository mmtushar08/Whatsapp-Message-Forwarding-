import { useState } from 'react';
import type { WorkspaceSetup } from '../types';

/** Problems found while connecting (registration, template, subscription). */
export function SetupWarnings({ workspace }: { workspace: WorkspaceSetup }) {
  if (workspace.setupWarnings.length === 0) return null;
  return (
    <div
      className="rounded-[10px] px-4 py-3 text-sm space-y-1.5"
      style={{ background: '#FBF0DC', border: '1px solid #E8A23D', color: '#6B4A10' }}
      role="status"
    >
      <strong className="block">Your number is connected, but needs attention:</strong>
      <ul className="list-disc pl-5 space-y-1">
        {workspace.setupWarnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span style={{ color: '#5C6B63' }}>{label}</span>
      <span className="flex items-center gap-2">
        <code className="rounded-[7px] px-2.5 py-1.5 font-mono text-xs break-all" style={{ background: '#EDF1EE' }}>
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="rounded-[7px] px-2 py-1 text-xs font-semibold border"
          style={{ borderColor: '#DCE4DF', color: '#14201B' }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </span>
    </div>
  );
}

/**
 * Webhook details for customers who connected their own Meta app: they must
 * point that app's webhook at us. Embedded Signup numbers need none of this.
 */
export function WebhookDetails({ workspace }: { workspace: WorkspaceSetup }) {
  if (workspace.connectionMethod !== 'manual') return null;
  const waiting = workspace.status === 'needs_webhook_setup';
  return (
    <div
      className="rounded-[12px] p-4 text-sm space-y-3"
      style={
        waiting
          ? { background: '#FBF0DC', border: '1px solid #E8A23D' }
          : { background: '#FAFCFA', border: '1px solid #DCE4DF' }
      }
    >
      {waiting ? (
        <p style={{ color: '#6B4A10' }}>
          <strong>One more step:</strong> in your Meta app go to <b>WhatsApp → Configuration</b>, set
          this callback URL and verify token, then subscribe to the <code>messages</code> field. This
          page turns green as soon as Meta reaches us.
        </p>
      ) : (
        <p style={{ color: '#5C6B63' }}>Your Meta app's webhook points here:</p>
      )}
      <CopyField label="Callback URL" value={workspace.webhookUrl} />
      <CopyField label="Verify token" value={workspace.webhookVerifyToken} />
    </div>
  );
}
