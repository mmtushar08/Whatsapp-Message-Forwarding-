import { useEffect, useRef, useState } from 'react';

export interface MetaLoginResult {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
}

interface Props {
  onClose: () => void;
  onComplete: (result: MetaLoginResult) => void;
}

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string | undefined;

export default function MetaLoginModal({ onClose, onComplete }: Props) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const accessTokenRef = useRef('');

  // Load Facebook JS SDK
  useEffect(() => {
    window.fbAsyncInit = () => {
      if (!META_APP_ID || !window.FB) return;
      window.FB.init({ appId: META_APP_ID, version: 'v20.0', cookie: true, xfbml: false });
    };
    if (!document.getElementById('facebook-jssdk')) {
      const s = document.createElement('script');
      s.id = 'facebook-jssdk';
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.body.appendChild(s);
    }
    return () => { window.fbAsyncInit = undefined; };
  }, []);

  // Listen for Meta Embedded Signup postMessage (FINISH / CANCEL / ERROR)
  useEffect(() => {
    function onMsg(event: MessageEvent) {
      if (!event.origin.endsWith('facebook.com')) return;

      let p: {
        type?: string;
        event?: string;
        data?: { phone_number_id?: string; waba_id?: string };
      } | null = null;

      if (typeof event.data === 'string') {
        try { p = JSON.parse(event.data); } catch { return; }
      } else {
        p = event.data as typeof p;
      }

      if (!p || p.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (p.event === 'CANCEL') {
        setStatus('idle');
        return;
      }
      if (p.event === 'ERROR') {
        setError('Meta signup failed. Please try again.');
        setStatus('error');
        return;
      }
      if (p.event === 'FINISH') {
        const { phone_number_id, waba_id } = p.data ?? {};
        const tok = accessTokenRef.current;
        if (!tok || !phone_number_id || !waba_id) {
          setError('Meta did not return all required credentials. Please try again.');
          setStatus('error');
          return;
        }
        onComplete({ accessToken: tok, phoneNumberId: phone_number_id, wabaId: waba_id });
      }
    }

    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onComplete]);

  function handleConnect() {
    if (!META_APP_ID || !window.FB) {
      setError('Meta SDK not ready. Please refresh the page and try again.');
      setStatus('error');
      return;
    }
    setStatus('connecting');
    setError(null);

    window.FB.login(
      (response) => {
        if (response.authResponse?.accessToken) {
          accessTokenRef.current = response.authResponse.accessToken;
          setStatus('waiting');
        } else {
          setStatus('idle');
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { sessionInfoVersion: 2 },
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,20,16,.55)' }}
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
          {/* Idle / Error — show connect button */}
          {(status === 'idle' || status === 'error') && (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">💬</div>
                <h3 className="text-[18px] font-bold mb-2" style={{ color: '#1c2b33' }}>
                  Connect your WhatsApp Business
                </h3>
                <p className="text-[13.5px]" style={{ color: '#65766e' }}>
                  Log in with your Meta account. You'll choose your WhatsApp Business
                  Account and phone number in Meta's popup — no manual IDs needed.
                </p>
              </div>

              {error && (
                <div
                  className="mb-4 rounded-[8px] px-4 py-3 text-sm"
                  style={{ background: '#FBE3E2', color: '#A03330' }}
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleConnect}
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
                Meta will guide you through selecting your Business Portfolio,
                WhatsApp Business Account, and phone number.
              </p>
            </>
          )}

          {/* Connecting / Waiting */}
          {(status === 'connecting' || status === 'waiting') && (
            <div className="text-center py-10">
              <div
                className="w-12 h-12 rounded-full border-4 mx-auto mb-4"
                style={{
                  borderColor: '#E0EAFF',
                  borderTopColor: '#1877F2',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p className="font-semibold text-[15px]" style={{ color: '#1c2b33' }}>
                {status === 'connecting' ? 'Opening Meta…' : 'Complete the steps in the Meta popup'}
              </p>
              {status === 'waiting' && (
                <p className="text-[12.5px] mt-2" style={{ color: '#65766e' }}>
                  Finish selecting your WhatsApp Business Account in the Meta window.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
