import { useEffect, useState } from 'react';
import {
  EmbeddedSignupCancelled,
  EmbeddedSignupResult,
  isEmbeddedSignupConfigured,
  loadFacebookSdk,
  runEmbeddedSignup,
} from '../lib/embeddedSignup';

export type MetaLoginResult = EmbeddedSignupResult;

interface Props {
  onClose: () => void;
  onComplete: (result: MetaLoginResult) => void;
}

export default function MetaLoginModal({ onClose, onComplete }: Props) {
  const configured = isEmbeddedSignupConfigured();
  const [status, setStatus] = useState<'idle' | 'waiting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Load the SDK up front so FB.login() runs straight from the click and the
  // popup isn't blocked.
  useEffect(() => {
    if (!configured) return;
    loadFacebookSdk().catch((e: Error) => {
      setError(e.message);
      setStatus('error');
    });
  }, [configured]);

  async function handleConnect() {
    setError(null);
    setStatus('waiting');
    try {
      await loadFacebookSdk();
      const result = await runEmbeddedSignup();
      onComplete(result);
    } catch (e) {
      if (e instanceof EmbeddedSignupCancelled) {
        setStatus('idle');
        return;
      }
      setError((e as Error).message);
      setStatus('error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,20,16,.55)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Continue with WhatsApp Business"
    >
      <div
        className="w-full max-w-[420px] bg-white rounded-[12px] overflow-hidden"
        style={{ boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#1877F2' }}>
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <span
              className="w-6 h-6 rounded-full bg-white grid place-items-center font-black text-[14px]"
              style={{ color: '#1877F2' }}
            >f</span>
            Meta · WhatsApp Business Login
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white text-xl leading-none bg-transparent border-none"
            aria-label="Close"
          >×</button>
        </div>

        <div className="p-6">
          {!configured ? (
            <div className="text-center py-2">
              <div className="text-4xl mb-3">🔌</div>
              <h3 className="text-[17px] font-bold mb-2" style={{ color: '#1c2b33' }}>
                Meta login isn't set up yet
              </h3>
              <p className="text-[13.5px] mb-5" style={{ color: '#65766e' }}>
                This deployment has no Meta app configured. Use email and password for now.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[11px] px-5 py-2.5 text-sm font-semibold border"
                style={{ borderColor: '#DCE4DF', color: '#14201B' }}
              >
                Use email instead
              </button>
            </div>
          ) : status === 'waiting' ? (
            <div className="text-center py-10">
              <div
                className="w-12 h-12 rounded-full border-4 mx-auto mb-4 animate-spin"
                style={{ borderColor: '#E0EAFF', borderTopColor: '#1877F2' }}
              />
              <p className="font-semibold text-[15px]" style={{ color: '#1c2b33' }}>
                Complete the steps in the Meta window
              </p>
              <p className="text-[12.5px] mt-2" style={{ color: '#65766e' }}>
                Choose your business, WhatsApp Business Account and phone number.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">💬</div>
                <h3 className="text-[18px] font-bold mb-2" style={{ color: '#1c2b33' }}>
                  Connect your WhatsApp Business
                </h3>
                <p className="text-[13.5px]" style={{ color: '#65766e' }}>
                  Log in with your Meta account. You'll choose your WhatsApp Business
                  Account and phone number in Meta's window — no manual IDs needed.
                </p>
              </div>

              {error && (
                <div
                  className="mb-4 rounded-[8px] px-4 py-3 text-sm"
                  style={{ background: '#FBE3E2', color: '#A03330' }}
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleConnect()}
                className="w-full rounded-[11px] py-3 text-sm font-semibold text-white flex items-center justify-center gap-2.5"
                style={{ background: '#1877F2' }}
              >
                <span
                  className="w-5 h-5 rounded-full bg-white grid place-items-center font-black text-[13px] shrink-0"
                  style={{ color: '#1877F2' }}
                >f</span>
                Continue with Facebook
              </button>

              <p className="mt-3 text-center text-[11.5px]" style={{ color: '#65766e' }}>
                Already connected a number? Pick the same one to log back in.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
