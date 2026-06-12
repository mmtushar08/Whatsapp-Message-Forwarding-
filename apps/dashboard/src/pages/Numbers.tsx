import { Link } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

export default function Numbers() {
  const { workspace } = useProduct();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight" style={{ color: '#14201B' }}>Numbers</h1>
          <p className="text-sm" style={{ color: '#5C6B63' }}>WhatsApp Business numbers connected via Meta embedded signup.</p>
        </div>
        <Link to="/onboarding"
          className="rounded-[11px] px-4 py-2 text-sm font-semibold text-white flex items-center gap-1.5 no-underline"
          style={{ background: '#1877F2' }}>
          <b style={{ fontSize: 17 }}>f</b> Connect another number
        </Link>
      </div>

      {workspace ? (
        <div className="bg-white rounded-[14px] p-5" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
          <div className="flex justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="font-bold text-base" style={{ color: '#14201B' }}>
                  {workspace.businessLabel || 'WhatsApp Business Account'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11.5px] font-bold"
                  style={workspace.status === 'connected'
                    ? { background: '#E4F6EC', color: '#11713E' }
                    : { background: '#FBF0DC', color: '#8A5A0F' }}>
                  {workspace.status === 'connected' ? '● Connected' : '● Needs webhook setup'}
                </span>
              </div>
              <p className="font-mono text-sm" style={{ color: '#5C6B63' }}>
                {workspace.sourcePhoneNumber ? `+${workspace.sourcePhoneNumber}` : 'Number not set'} · Phone ID {workspace.phoneNumberId}
              </p>
              {workspace.wabaId && (
                <p className="font-mono text-xs mt-1" style={{ color: '#5C6B63' }}>WABA {workspace.wabaId}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[12.5px]" style={{ color: '#5C6B63' }}>Connected at</p>
              <p className="text-sm font-semibold" style={{ color: '#14201B' }}>
                {new Date(workspace.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 space-y-3 text-sm" style={{ borderTop: '1px solid #EDF1EE' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span style={{ color: '#5C6B63' }}>Webhook callback URL (configure in Meta dashboard)</span>
              <code className="rounded-[7px] px-2.5 py-1.5 font-mono text-xs" style={{ background: '#EDF1EE' }}>{workspace.webhookUrl}</code>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span style={{ color: '#5C6B63' }}>Verify token</span>
              <code className="rounded-[7px] px-2.5 py-1.5 font-mono text-xs" style={{ background: '#EDF1EE' }}>{workspace.webhookVerifyToken}</code>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span style={{ color: '#5C6B63' }}>Access token</span>
              <code className="rounded-[7px] px-2.5 py-1.5 font-mono text-xs" style={{ background: '#EDF1EE' }}>
                {workspace.accessTokenPreview ? `${workspace.accessTokenPreview}…` : 'configured'} (encrypted at rest)
              </code>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] p-8 text-center" style={{ border: '2px dashed #DCE4DF' }}>
          <div className="text-4xl mb-3">💬</div>
          <p className="font-semibold mb-1" style={{ color: '#14201B' }}>No number connected yet</p>
          <p className="text-sm mb-5" style={{ color: '#5C6B63' }}>Connect via Meta embedded signup to get started.</p>
          <Link to="/onboarding" className="inline-block rounded-[11px] px-6 py-3 text-sm font-semibold text-white no-underline" style={{ background: '#1FAB5E' }}>
            Connect WhatsApp →
          </Link>
        </div>
      )}
    </div>
  );
}
