import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeEmbeddedSignup } from '../api/client';

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string | undefined;

interface SignupMessage {
  type?: string;
  event?: string;
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    business_id?: string;
    current_step?: string;
  };
}

function parseSignupMessage(event: MessageEvent): SignupMessage | null {
  if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return null;
  try {
    return typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
  } catch {
    return null;
  }
}

const STEPS = ['Business', 'WhatsApp', 'First rule', 'Go live'];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex gap-2 mb-6">
      {STEPS.map((label, i) => {
        const done = i < step - 1;
        const now = i === step - 1;
        return (
          <div key={label} className="flex-1 text-center">
            <div className="h-[5px] rounded-full mb-1.5" style={{ background: done || now ? '#1FAB5E' : '#DCE4DF', boxShadow: now ? '0 0 0 3px rgba(31,171,94,.18)' : undefined }} />
            <div className="font-mono text-[10.5px] uppercase tracking-[0.1em]" style={{ color: now ? '#168B4B' : '#5C6B63', fontWeight: now ? 700 : 400 }}>
              {i + 1} · {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetaRequirements({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="mb-4 rounded-[9px] px-4 py-3 text-sm" style={{ background: '#FBE3E2', color: '#A03330' }}>{error}</div>;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [bizName, setBizName] = useState('');
  const [industry, setIndustry] = useState('Real estate');
  const [volume, setVolume] = useState('50 – 500');
  const [connected, setConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [ruleType, setRuleType] = useState('email');
  const [ruleValue, setRuleValue] = useState('');
  const [keyword, setKeyword] = useState('');

  const codeRef = useRef<string | null>(null);
  const wabaIdRef = useRef<string | null>(null);
  const phoneIdRef = useRef<string | null>(null);
  const businessIdRef = useRef<string | undefined>(undefined);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!META_APP_ID) {
      setError('VITE_META_APP_ID is not configured.');
      return;
    }
    const initialize = () => {
      if (!window.FB || !META_APP_ID) return;
      window.FB.init({ appId: META_APP_ID, cookie: true, xfbml: false, version: 'v22.0' });
      setSdkReady(true);
    };
    if (window.FB) initialize();
    else {
      window.fbAsyncInit = initialize;
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        document.body.appendChild(script);
      }
    }
    return () => { window.fbAsyncInit = undefined; };
  }, []);

  useEffect(() => {
    const maybeComplete = async () => {
      const code = codeRef.current;
      const wabaId = wabaIdRef.current;
      const phoneId = phoneIdRef.current;
      if (!code || !wabaId || !phoneId || submittingRef.current) return;
      submittingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const result = await completeEmbeddedSignup({ code, wabaId, phoneNumberId: phoneId, businessId: businessIdRef.current });
        setConnected(true);
        setPhoneNumber(phoneId);
        setStep(3);
        void result;
      } catch (err) {
        submittingRef.current = false;
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    const onMessage = (event: MessageEvent) => {
      const message = parseSignupMessage(event);
      if (!message || message.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (message.event === 'CANCEL') {
        setError(`Meta signup cancelled${message.data?.current_step ? ` on ${message.data.current_step}.` : '.'}`);
        return;
      }
      if (message.event === 'ERROR') {
        setError('Meta Embedded Signup reported an error. Please try again.');
        return;
      }
      if (message.event !== 'FINISH') return;
      wabaIdRef.current = message.data?.waba_id ?? wabaIdRef.current;
      phoneIdRef.current = message.data?.phone_number_id ?? phoneIdRef.current;
      businessIdRef.current = message.data?.business_id ?? businessIdRef.current;
      void maybeComplete();
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function launchEmbeddedSignup() {
    setError(null);
    if (!META_APP_ID || !META_CONFIG_ID) {
      setError('Meta Embedded Signup is not configured. Set VITE_META_APP_ID and VITE_META_CONFIG_ID.');
      return;
    }
    if (!sdkReady || !window.FB) {
      setError('Meta SDK is still loading. Please wait a moment and try again.');
      return;
    }
    if (submittingRef.current) return;

    codeRef.current = null;
    wabaIdRef.current = null;
    phoneIdRef.current = null;
    businessIdRef.current = undefined;

    window.FB.login((response: { authResponse?: { code?: string } }) => {
      const code = response.authResponse?.code;
      if (code) {
        codeRef.current = code;
        if (wabaIdRef.current && phoneIdRef.current) {
          // The FINISH postMessage can arrive before or after the FB.login callback.
          const event = new Event('embedded-signup-code-ready');
          window.dispatchEvent(event);
        }
        return;
      }
      setError('Meta login was cancelled or no authorization code was returned.');
    }, {
      config_id: META_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {} },
    });
  }

  useEffect(() => {
    const onCodeReady = () => {
      const code = codeRef.current;
      const wabaId = wabaIdRef.current;
      const phoneId = phoneIdRef.current;
      if (!code || !wabaId || !phoneId || submittingRef.current) return;
      submittingRef.current = true;
      setLoading(true);
      setError(null);
      completeEmbeddedSignup({ code, wabaId, phoneNumberId: phoneId, businessId: businessIdRef.current })
        .then(() => { setConnected(true); setPhoneNumber(phoneId); setStep(3); })
        .catch((err) => { submittingRef.current = false; setError((err as Error).message); })
        .finally(() => setLoading(false));
    };
    window.addEventListener('embedded-signup-code-ready', onCodeReady);
    return () => window.removeEventListener('embedded-signup-code-ready', onCodeReady);
  }, []);

  const destinationPlaceholder = ruleType === 'email' ? 'sales@example.com' : ruleType === 'webhook' ? 'https://api.example.com/whatsapp' : ruleType === 'slack' ? '#whatsapp-leads' : '+91 90000 11122';

  return (
    <div className="min-h-screen bg-[#F4F7F4] py-10 px-4">
      <div className="max-w-[660px] mx-auto">
        <div className="flex items-center gap-2 font-extrabold text-[19px] tracking-tight mb-6" style={{ color: '#14201B' }}>
          <div className="w-8 h-8 rounded-[9px] grid place-items-center text-white text-sm font-bold" style={{ background: '#1FAB5E' }}>⇶</div>
          Sendo.cloud
        </div>
        <StepBar step={step} />

        {step === 1 && (
          <div className="bg-white rounded-[14px] p-8" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
            <h2 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Tell us about your business</h2>
            <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>This sets up your workspace and helps us suggest the right forwarding rules.</p>
            <div className="space-y-4">
              <label className="block"><span className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Business name</span><input className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ border: '1.5px solid #DCE4DF' }} value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Acme Realty" /></label>
              <label className="block"><span className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Industry</span><select className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ border: '1.5px solid #DCE4DF' }} value={industry} onChange={(e) => setIndustry(e.target.value)}>{['Real estate', 'E-commerce', 'Healthcare', 'Education', 'Services / Agency', 'Other'].map((o) => <option key={o}>{o}</option>)}</select></label>
              <label className="block"><span className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Daily WhatsApp messages</span><select className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ border: '1.5px solid #DCE4DF' }} value={volume} onChange={(e) => setVolume(e.target.value)}>{['Under 50', '50 – 500', '500 – 5,000', '5,000+'].map((o) => <option key={o}>{o}</option>)}</select></label>
            </div>
            <div className="flex justify-end mt-6"><button type="button" onClick={() => setStep(2)} className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white" style={{ background: '#1FAB5E' }}>Continue →</button></div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-[14px] p-8" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
            <h2 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Connect your WhatsApp Business number</h2>
            <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>Use Meta's official Embedded Signup. Your customer keeps ownership of their Business Portfolio and WABA.</p>
            <MetaRequirements error={error} />
            {!connected ? (
              <div className="rounded-[16px] p-8 text-center" style={{ border: '2px dashed #DCE4DF', background: '#FAFCFA' }}>
                <div className="text-4xl mb-2.5">💬</div>
                <p className="font-semibold mb-1" style={{ color: '#14201B' }}>No WhatsApp number connected</p>
                <p className="text-sm mb-5" style={{ color: '#5C6B63' }}>You'll sign in with Meta and select or create the customer's Business Portfolio, WABA and phone number.</p>
                <button type="button" onClick={launchEmbeddedSignup} disabled={loading} className="rounded-[11px] px-5 py-3 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50" style={{ background: '#1877F2' }}>
                  <b style={{ fontSize: 17 }}>f</b>{loading ? 'Connecting…' : 'Connect with Meta'}
                </button>
                <p className="mt-4 text-[11px]" style={{ color: '#7A877F' }}>Meta's own signup window will open. Sendo.cloud never asks the customer to paste an access token.</p>
              </div>
            ) : (
              <div className="rounded-[16px] p-6" style={{ border: '2px solid #BFE7D1', background: '#F0FAF4' }}>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11.5px] font-bold mb-2.5" style={{ background: '#E4F6EC', color: '#11713E' }}>● Connected</span>
                <p className="font-bold text-base" style={{ color: '#14201B' }}>{bizName || 'WhatsApp Business Account'}</p>
                <p className="font-mono text-sm mt-0.5" style={{ color: '#5C6B63' }}>Phone ID: {phoneNumber}</p>
              </div>
            )}
            <div className="flex justify-between items-center mt-6"><button type="button" onClick={() => setStep(1)} className="text-[13.5px] underline bg-transparent border-none" style={{ color: '#5C6B63' }}>← Back</button><button type="button" disabled={!connected} onClick={() => setStep(3)} className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#1FAB5E' }}>Continue →</button></div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-[14px] p-8" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
            <h2 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Create your first forwarding rule</h2>
            <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>Where should incoming messages go?</p>
            <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
              {[['email','✉️','Email'],['webhook','⚙️','Webhook'],['slack','#','Slack'],['number','📱','Another number']].map(([id, icon, label]) => <button key={id} type="button" onClick={() => setRuleType(id)} className="rounded-[12px] p-4 text-center text-sm font-semibold border" style={{ borderColor: ruleType === id ? '#1FAB5E' : '#DCE4DF', background: ruleType === id ? '#F0FAF4' : '#fff' }}><span className="block text-[21px] mb-1.5">{icon}</span>{label}</button>)}
            </div>
            <label className="block mb-4"><span className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Forward to</span><input className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ border: '1.5px solid #DCE4DF' }} value={ruleValue} onChange={(e) => setRuleValue(e.target.value)} placeholder={destinationPlaceholder} /></label>
            <label className="block"><span className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Keyword filter (optional)</span><input className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ border: '1.5px solid #DCE4DF' }} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="price, booking, site visit" /></label>
            <div className="flex justify-between items-center mt-6"><button type="button" onClick={() => setStep(4)} className="text-[13.5px] underline bg-transparent border-none" style={{ color: '#5C6B63' }}>I'll do this later</button><button type="button" onClick={() => setStep(4)} className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white" style={{ background: '#1FAB5E' }}>Create rule →</button></div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white rounded-[14px] p-8" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
            <div className="text-center py-4"><div className="w-[72px] h-[72px] rounded-full grid place-items-center text-4xl mx-auto mb-5" style={{ background: '#E4F6EC', color: '#168B4B' }}>✓</div><h2 className="text-[23px] font-bold tracking-tight mb-2" style={{ color: '#14201B' }}>You're live{bizName ? `, ${bizName}` : ''}! 🎉</h2><p className="text-sm mb-6 mx-auto max-w-[42ch]" style={{ color: '#5C6B63' }}>Your WhatsApp connection is ready. You can configure forwarding rules from the dashboard.</p><button type="button" onClick={() => navigate('/app')} className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white" style={{ background: '#1FAB5E' }}>Go to dashboard →</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
