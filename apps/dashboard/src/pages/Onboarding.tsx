import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWabaInfo, PhoneOption } from '../api/client';
import { useProduct } from '../context/ProductContext';

/* ── types ── */
interface EmbeddedSignupMessage {
  type?: string;
  event?: 'FINISH' | 'CANCEL' | 'ERROR';
  data?: { phone_number_id?: string; waba_id?: string };
}
declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (o: { appId: string; version: string; xfbml?: boolean; cookie?: boolean }) => void;
      login: (cb: (r: { authResponse?: { accessToken?: string } }) => void, o: object) => void;
    };
  }
}

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;

function parseMsg(event: MessageEvent): EmbeddedSignupMessage | null {
  if (!event.origin.endsWith('facebook.com')) return null;
  if (typeof event.data === 'string') { try { return JSON.parse(event.data); } catch { return null; } }
  return event.data as EmbeddedSignupMessage;
}

/* ── step progress bar ── */
const STEPS = ['Business', 'WhatsApp', 'First rule', 'Go live'];
function StepBar({ step }: { step: number }) {
  return (
    <div className="flex gap-2 mb-6">
      {STEPS.map((label, i) => {
        const done = i < step - 1;
        const now  = i === step - 1;
        return (
          <div key={label} className="flex-1 text-center">
            <div
              className="h-[5px] rounded-full mb-1.5"
              style={{
                background: done || now ? '#1FAB5E' : '#DCE4DF',
                boxShadow: now ? '0 0 0 3px rgba(31,171,94,.18)' : undefined,
              }}
            />
            <div
              className="font-mono text-[10.5px] uppercase tracking-[0.1em]"
              style={{ color: now ? '#168B4B' : '#5C6B63', fontWeight: now ? 700 : 400 }}
            >
              {i + 1} · {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Meta popup simulation ── */
function MetaPopup({ onClose, onFinish }: { onClose: () => void; onFinish: () => void }) {
  const [metaStep, setMetaStep] = useState(1);

  function finish() {
    setMetaStep(6);
    setTimeout(() => { onClose(); onFinish(); }, 1400);
  }

  const Foot = ({ back, next, nextLabel = 'Next' }: { back?: () => void; next: () => void; nextLabel?: string }) => (
    <div className="flex justify-end gap-2.5 pt-4">
      {back && <button type="button" onClick={back} className="rounded-[9px] px-4 py-2 text-sm font-semibold border" style={{ borderColor: '#dde3e8', color: '#1c2b33' }}>Back</button>}
      <button type="button" onClick={next} className="rounded-[9px] px-4 py-2 text-sm font-semibold text-white" style={{ background: '#1877F2' }}>{nextLabel}</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,20,16,.55)' }}>
      <div className="w-full max-w-[480px] bg-white rounded-[12px] overflow-hidden" style={{ boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#1877F2' }}>
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-white grid place-items-center font-black text-[14px]" style={{ color: '#1877F2' }}>f</span>
            Meta · WhatsApp embedded signup
          </div>
          <button type="button" onClick={onClose} className="text-white text-xl leading-none bg-transparent border-none">×</button>
        </div>

        {/* Step 1 */}
        {metaStep === 1 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">STEP 1 OF 5 · FACEBOOK LOGIN</div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>Continue as Tushar?</h3>
            <p className="text-[13.5px] mb-5" style={{ color: '#65766e' }}>Sendro will receive your name, profile picture and access to manage your WhatsApp Business Account.</p>
            <div className="border rounded-[10px] p-3.5 flex items-center gap-3" style={{ borderColor: '#dde3e8' }}>
              <div className="w-9 h-9 rounded-full grid place-items-center font-bold text-xs shrink-0" style={{ background: '#E8A23D', color: '#3E2A05' }}>TM</div>
              <div><div className="font-bold text-sm">Tushar M.</div><div className="text-xs" style={{ color: '#65766e' }}>Facebook account</div></div>
            </div>
            <Foot next={() => setMetaStep(2)} nextLabel="Continue as Tushar" />
          </div>
        )}

        {/* Step 2 */}
        {metaStep === 2 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">STEP 2 OF 5 · BUSINESS PORTFOLIO</div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>Choose a business portfolio</h3>
            <p className="text-[13.5px] mb-4" style={{ color: '#65766e' }}>Select the Meta Business Portfolio that owns your WhatsApp account.</p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { icon: '🏢', name: 'Acme Realty', sub: 'Business ID · 2841…07 · Verified', on: true },
                { icon: '🏪', name: 'Tushar Side Projects', sub: 'Business ID · 5530…91', on: false },
                { icon: '＋', name: 'Create a new business portfolio', sub: '', on: false },
              ].map(item => (
                <div key={item.name} className="flex items-center gap-3 p-3.5 rounded-[10px] border" style={{ borderColor: item.on ? '#1877F2' : '#dde3e8', background: item.on ? '#F0F6FE' : '#fff' }}>
                  <div className="w-9 h-9 rounded-[9px] bg-[#E7EDF2] grid place-items-center text-lg shrink-0">{item.icon}</div>
                  <div><div className="font-bold text-sm">{item.name}</div>{item.sub && <div className="text-xs" style={{ color: '#65766e' }}>{item.sub}</div>}</div>
                </div>
              ))}
            </div>
            <Foot back={() => setMetaStep(1)} next={() => setMetaStep(3)} />
          </div>
        )}

        {/* Step 3 */}
        {metaStep === 3 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">STEP 3 OF 5 · WHATSAPP BUSINESS ACCOUNT</div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>Select a WhatsApp Business Account</h3>
            <p className="text-[13.5px] mb-4" style={{ color: '#65766e' }}>Pick an existing WABA or create a new one under Acme Realty.</p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { icon: '💬', name: 'acme-realty-waba', sub: 'WABA ID · 1042…88 · 1 phone number', on: true },
                { icon: '＋', name: 'Create a new WhatsApp Business Account', sub: '', on: false },
              ].map(item => (
                <div key={item.name} className="flex items-center gap-3 p-3.5 rounded-[10px] border" style={{ borderColor: item.on ? '#1877F2' : '#dde3e8', background: item.on ? '#F0F6FE' : '#fff' }}>
                  <div className="w-9 h-9 rounded-[9px] bg-[#E7EDF2] grid place-items-center text-lg shrink-0">{item.icon}</div>
                  <div><div className="font-bold text-sm">{item.name}</div>{item.sub && <div className="text-xs" style={{ color: '#65766e' }}>{item.sub}</div>}</div>
                </div>
              ))}
            </div>
            <Foot back={() => setMetaStep(2)} next={() => setMetaStep(4)} />
          </div>
        )}

        {/* Step 4 */}
        {metaStep === 4 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">STEP 4 OF 5 · PHONE NUMBER</div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>Choose the number to connect</h3>
            <p className="text-[13.5px] mb-4" style={{ color: '#65766e' }}>This number will send and receive messages through the WhatsApp Cloud API.</p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { icon: '📱', name: '+91 98765 43210', sub: 'Acme Realty Support · Verified · Quality: High', on: true },
                { icon: '＋', name: 'Add a new phone number', sub: "You'll verify it by SMS or voice call", on: false },
              ].map(item => (
                <div key={item.name} className="flex items-center gap-3 p-3.5 rounded-[10px] border" style={{ borderColor: item.on ? '#1877F2' : '#dde3e8', background: item.on ? '#F0F6FE' : '#fff' }}>
                  <div className="w-9 h-9 rounded-[9px] bg-[#E7EDF2] grid place-items-center text-lg shrink-0">{item.icon}</div>
                  <div><div className="font-bold text-sm font-mono">{item.name}</div><div className="text-xs" style={{ color: '#65766e' }}>{item.sub}</div></div>
                </div>
              ))}
            </div>
            <Foot back={() => setMetaStep(3)} next={() => setMetaStep(5)} />
          </div>
        )}

        {/* Step 5 — permissions */}
        {metaStep === 5 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">STEP 5 OF 5 · PERMISSIONS</div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>What Sendro is allowed to do</h3>
            <p className="text-[13.5px] mb-4" style={{ color: '#65766e' }}>You can review or revoke this anytime in Meta Business settings.</p>
            {[
              'Receive incoming messages on +91 98765 43210 via webhooks',
              'Read your WhatsApp Business Account profile & phone numbers',
              'Send messages on your behalf (for forward-to-number rules)',
              'Manage message templates',
            ].map(p => (
              <div key={p} className="flex gap-2.5 text-[13.5px] mb-2.5" style={{ color: '#3b4a43' }}>
                <span className="font-black shrink-0" style={{ color: '#1877F2' }}>✓</span>
                {p}
              </div>
            ))}
            <Foot back={() => setMetaStep(4)} next={finish} nextLabel="Finish & connect" />
          </div>
        )}

        {/* Step 6 — success */}
        {metaStep === 6 && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full grid place-items-center text-3xl mx-auto mb-4" style={{ background: '#E4F6EC', color: '#168B4B' }}>✓</div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>Connected!</h3>
            <p className="text-[13.5px]" style={{ color: '#65766e' }}>+91 98765 43210 is now linked to Sendro.<br />Returning you to the app…</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── destination picker for step 3 ── */
const DEST_OPTS = [
  { id: 'email',   icon: '✉️',  label: 'Email',           placeholder: 'sales@acmerealty.in' },
  { id: 'webhook', icon: '⚙️',  label: 'Webhook',         placeholder: 'https://api.example.com/wa' },
  { id: 'slack',   icon: '#',   label: 'Slack',           placeholder: '#leads-whatsapp' },
  { id: 'number',  icon: '📱',  label: 'Another number',  placeholder: '+91 90000 11122' },
];

/* ── main component ── */
export default function Onboarding() {
  const navigate = useNavigate();
  const { saveEmbeddedSignup } = useProduct();

  /* step 1-4 */
  const [step, setStep] = useState(1);

  /* step 1 state */
  const [bizName, setBizName]     = useState('');
  const [industry, setIndustry]   = useState('Real estate');
  const [volume, setVolume]       = useState('50 – 500');

  /* step 2 state */
  const [showMeta, setShowMeta]   = useState(false);
  const [connected, setConnected] = useState(false);
  const [demoPhone, setDemoPhone] = useState('');
  const [showDemo, setShowDemo]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const accessTokenRef            = useRef('');
  const [, setSdkReady]           = useState(false);

  /* step 3 state */
  const [destType, setDestType]     = useState('email');
  const [destValue, setDestValue]   = useState('sales@acmerealty.in');
  const [keyword, setKeyword]       = useState('');

  /* manual tab */
  const [manualToken, setManualToken]   = useState('');
  const [manualPhones, setManualPhones] = useState<PhoneOption[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<PhoneOption | null>(null);
  const [manualState, setManualState]   = useState<'idle' | 'fetching' | 'found' | 'saving' | 'saved'>('idle');
  const [manualErr, setManualErr]       = useState<string | null>(null);
  const [tab, setTab] = useState<'embedded' | 'manual'>('embedded');

  useEffect(() => {
    window.fbAsyncInit = () => {
      if (!META_APP_ID || !window.FB) return;
      window.FB.init({ appId: META_APP_ID, version: 'v19.0', cookie: true, xfbml: false });
      setSdkReady(true);
    };
    if (!document.getElementById('facebook-jssdk')) {
      const s = document.createElement('script');
      s.id = 'facebook-jssdk'; s.async = true; s.defer = true;
      s.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.body.appendChild(s);
    } else if (window.FB && META_APP_ID) {
      setSdkReady(true);
    }
    return () => { window.fbAsyncInit = undefined; };
  }, []);

  useEffect(() => {
    async function onMsg(event: MessageEvent) {
      const p = parseMsg(event);
      if (!p || p.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (p.event === 'CANCEL' || p.event === 'ERROR') { setErr('Meta signup was cancelled or failed.'); return; }
      if (p.event !== 'FINISH') return;
      const { phone_number_id, waba_id } = p.data ?? {};
      const tok = accessTokenRef.current;
      if (!tok || !phone_number_id || !waba_id) { setErr('Meta did not return credentials.'); return; }
      const res = await saveEmbeddedSignup({ accessToken: tok, phoneNumberId: phone_number_id, wabaId: waba_id });
      if (res.ok) setConnected(true); else setErr(res.error);
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [saveEmbeddedSignup]);

  async function doSave(accessToken: string, phoneNumberId: string, wabaId: string) {
    setSaving(true); setErr(null);
    const res = await saveEmbeddedSignup({ accessToken, phoneNumberId, wabaId });
    setSaving(false);
    if (res.ok) setConnected(true); else setErr(res.error);
  }

  async function handleManualFetch() {
    setManualState('fetching'); setManualErr(null); setManualPhones([]); setSelectedPhone(null);
    try {
      const r = await fetchWabaInfo(manualToken);
      setManualPhones(r.phones); setSelectedPhone(r.phones[0] ?? null); setManualState('found');
    } catch (e) { setManualErr((e as Error).message); setManualState('idle'); }
  }

  async function handleManualConnect() {
    if (!selectedPhone) return;
    setManualState('saving'); setManualErr(null);
    const res = await saveEmbeddedSignup({ accessToken: manualToken, phoneNumberId: selectedPhone.phoneNumberId, wabaId: selectedPhone.wabaId });
    if (res.ok) { setConnected(true); setManualState('saved'); } else { setManualErr(res.error); setManualState('idle'); }
  }

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white rounded-[14px] p-8" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
      {children}
    </div>
  );

  const Foot = ({ back, onNext, nextLabel = 'Continue →', nextDisabled = false }: { back?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean }) => (
    <div className="flex justify-between items-center mt-6">
      {back
        ? <button type="button" onClick={back} className="text-[13.5px] underline bg-transparent border-none" style={{ color: '#5C6B63' }}>← Back</button>
        : <span />}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
        style={{ background: '#1FAB5E' }}
      >
        {nextLabel}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7F4] py-10 px-4">
      {showMeta && (
        <MetaPopup
          onClose={() => setShowMeta(false)}
          onFinish={async () => {
            await doSave('DEMO_META_TOKEN', 'demo_919876543210', 'waba_demo_919876543210');
          }}
        />
      )}

      <div className="max-w-[660px] mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 font-extrabold text-[19px] tracking-tight mb-6" style={{ color: '#14201B' }}>
          <div className="w-8 h-8 rounded-[9px] grid place-items-center text-white text-sm font-bold" style={{ background: '#1FAB5E' }}>⇶</div>
          Sendro
        </div>

        <StepBar step={step} />

        {/* ── STEP 1: Business profile ── */}
        {step === 1 && (
          <Card>
            <h2 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Tell us about your business</h2>
            <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>This sets up your workspace and helps us suggest the right forwarding rules.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Business name</label>
                <input
                  className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
                  style={{ border: '1.5px solid #DCE4DF' }}
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  placeholder="Acme Realty"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Industry</label>
                <select
                  className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
                  style={{ border: '1.5px solid #DCE4DF' }}
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                >
                  {['Real estate', 'E-commerce', 'Healthcare', 'Education', 'Services / Agency', 'Other'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Daily WhatsApp messages</label>
                <select
                  className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
                  style={{ border: '1.5px solid #DCE4DF' }}
                  value={volume}
                  onChange={e => setVolume(e.target.value)}
                >
                  {['Under 50', '50 – 500', '500 – 5,000', '5,000+'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <Foot back={() => navigate('/app')} onNext={() => setStep(2)} nextLabel="Continue →" />
          </Card>
        )}

        {/* ── STEP 2: Connect WhatsApp ── */}
        {step === 2 && (
          <Card>
            <h2 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Connect your WhatsApp Business number</h2>
            <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>Use Meta's official embedded signup or import an existing account.</p>

            {/* Tab switcher */}
            <div className="flex gap-1 rounded-[8px] p-1 mb-6" style={{ background: '#EDF1EE' }}>
              {(['embedded', 'manual'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="flex-1 rounded-[6px] py-2 text-sm font-semibold transition"
                  style={tab === t ? { background: '#fff', color: '#14201B', boxShadow: '0 1px 4px rgba(0,0,0,.08)' } : { color: '#5C6B63' }}
                >
                  {t === 'embedded' ? 'Connect with Meta' : 'Import existing account'}
                </button>
              ))}
            </div>

            {tab === 'embedded' && (
              <>
                {!connected ? (
                  <div className="rounded-[16px] p-8 text-center mb-4" style={{ border: '2px dashed #DCE4DF', background: '#FAFCFA' }}>
                    <div className="text-4xl mb-2.5">💬</div>
                    <p className="font-semibold mb-1" style={{ color: '#14201B' }}>No number connected yet</p>
                    <p className="text-sm mb-5" style={{ color: '#5C6B63' }}>You'll need admin access to your Meta Business Portfolio.</p>
                    <button
                      type="button"
                      onClick={() => setShowMeta(true)}
                      className="rounded-[11px] px-5 py-3 text-sm font-semibold text-white flex items-center gap-2 mx-auto"
                      style={{ background: '#1877F2' }}
                    >
                      <b style={{ fontSize: 17 }}>f</b> Login with Facebook
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDemo(!showDemo)}
                      className="mt-4 text-xs underline bg-transparent border-none"
                      style={{ color: '#5C6B63' }}
                    >
                      Skip — use demo / test number
                    </button>
                    {showDemo && (
                      <div className="mt-4 rounded-[8px] p-4 text-left space-y-2.5" style={{ border: '1px solid #DCE4DF', background: '#fff' }}>
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em]" style={{ color: '#5C6B63' }}>Demo mode — enter any test number</p>
                        <input
                          type="text"
                          value={demoPhone}
                          onChange={e => setDemoPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full rounded-[6px] px-3 py-2 text-sm outline-none"
                          style={{ border: '1.5px solid #DCE4DF' }}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              const ph = demoPhone.trim() || '+91 98765 43210';
                              const id = `demo_${ph.replace(/\D/g, '')}`;
                              doSave('DEMO_ACCESS_TOKEN', id, `waba_${id}`);
                            }}
                            className="rounded-[8px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            style={{ background: '#1FAB5E' }}
                          >
                            {saving ? 'Connecting…' : 'Connect demo number'}
                          </button>
                          <button type="button" onClick={() => setShowDemo(false)} className="rounded-[8px] px-4 py-2 text-sm border" style={{ borderColor: '#DCE4DF', color: '#5C6B63' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-[16px] p-6 mb-4" style={{ border: '2px solid #BFE7D1', background: '#F0FAF4' }}>
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11.5px] font-bold mb-2.5" style={{ background: '#E4F6EC', color: '#11713E' }}>● Connected</span>
                        <p className="font-bold text-base" style={{ color: '#14201B' }}>{bizName || 'WhatsApp Business Account'}</p>
                        <p className="font-mono text-sm mt-0.5" style={{ color: '#5C6B63' }}>{demoPhone || '+91 98765 43210'}</p>
                      </div>
                      <button type="button" onClick={() => setShowMeta(true)} className="rounded-[9px] px-3 py-1.5 text-sm font-semibold border" style={{ borderColor: '#DCE4DF', color: '#14201B' }}>Reconnect</button>
                    </div>
                  </div>
                )}
                {err && <div className="mb-4 rounded-[8px] px-4 py-3 text-sm" style={{ background: '#FBE3E2', color: '#A03330' }}>{err}</div>}
              </>
            )}

            {tab === 'manual' && (
              <div className="space-y-4">
                {manualState !== 'saved' && (
                  <>
                    <div>
                      <label className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Permanent Access Token</label>
                      <textarea
                        value={manualToken}
                        onChange={e => setManualToken(e.target.value.trim())}
                        rows={3}
                        placeholder="EAABwzLixnjYBO..."
                        className="w-full rounded-[6px] px-3 py-2 font-mono text-xs outline-none"
                        style={{ border: '1.5px solid #DCE4DF' }}
                      />
                    </div>
                    <button type="button" onClick={handleManualFetch} disabled={!manualToken || manualState === 'fetching'} className="rounded-[9px] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#14201B' }}>
                      {manualState === 'fetching' ? 'Looking up…' : 'Find My Numbers'}
                    </button>
                  </>
                )}
                {manualErr && <div className="rounded-[8px] px-4 py-3 text-sm" style={{ background: '#FBE3E2', color: '#A03330' }}>{manualErr}</div>}
                {(manualState === 'found' || manualState === 'saving') && manualPhones.length > 0 && (
                  <div className="space-y-2">
                    {manualPhones.map(p => (
                      <label key={p.phoneNumberId} className="flex items-start gap-3 rounded-[8px] p-4 cursor-pointer" style={{ border: `1.5px solid ${selectedPhone?.phoneNumberId === p.phoneNumberId ? '#1FAB5E' : '#DCE4DF'}`, background: selectedPhone?.phoneNumberId === p.phoneNumberId ? '#F0FAF4' : '#fff' }}>
                        <input type="radio" name="phone" checked={selectedPhone?.phoneNumberId === p.phoneNumberId} onChange={() => setSelectedPhone(p)} className="mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold">{p.displayPhoneNumber}</div>
                          <div className="text-xs" style={{ color: '#5C6B63' }}>{p.verifiedName}</div>
                        </div>
                      </label>
                    ))}
                    <button type="button" onClick={handleManualConnect} disabled={!selectedPhone || manualState === 'saving'} className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#1FAB5E' }}>
                      {manualState === 'saving' ? 'Connecting…' : 'Connect This Number'}
                    </button>
                  </div>
                )}
                {manualState === 'saved' && (
                  <div className="rounded-[8px] px-4 py-3 text-sm" style={{ background: '#E4F6EC', color: '#11713E' }}>
                    ✓ {selectedPhone?.displayPhoneNumber} connected!
                  </div>
                )}
              </div>
            )}

            <Foot
              back={() => setStep(1)}
              onNext={() => { if (connected || manualState === 'saved') setStep(3); }}
              nextLabel="Continue →"
              nextDisabled={!connected && manualState !== 'saved'}
            />
          </Card>
        )}

        {/* ── STEP 3: First rule ── */}
        {step === 3 && (
          <Card>
            <h2 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Create your first forwarding rule</h2>
            <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>Where should incoming messages go?</p>

            <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
              {DEST_OPTS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setDestType(opt.id); setDestValue(opt.placeholder); }}
                  className="rounded-[12px] p-4 text-center text-sm font-semibold border transition"
                  style={{
                    borderColor: destType === opt.id ? '#1FAB5E' : '#DCE4DF',
                    background: destType === opt.id ? '#F0FAF4' : '#fff',
                    boxShadow: destType === opt.id ? '0 0 0 3px rgba(31,171,94,.14)' : undefined,
                    color: '#14201B',
                  }}
                >
                  <span className="block text-[21px] mb-1.5">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>
                  Forward to {DEST_OPTS.find(o => o.id === destType)?.label}
                </label>
                <input
                  className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
                  style={{ border: '1.5px solid #DCE4DF' }}
                  value={destValue}
                  onChange={e => setDestValue(e.target.value)}
                  placeholder={DEST_OPTS.find(o => o.id === destType)?.placeholder}
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Only forward messages containing (optional)</label>
                <input
                  className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
                  style={{ border: '1.5px solid #DCE4DF' }}
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. price, booking, site visit"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 rounded-[12px] p-4" style={{ background: '#FAFCFA', border: '1px solid #DCE4DF' }}>
              <div className="flex items-center gap-2.5">
                <div className="rounded-[14px_14px_14px_4px] px-3 py-2 text-sm" style={{ background: '#E4F6EC', border: '1px solid #BFE7D1' }}>
                  {keyword ? `Contains "${keyword}"` : 'Incoming message'} <span style={{ color: '#4FB6EC', fontWeight: 800 }}>✓✓</span>
                </div>
                <div className="flex-1 h-0.5" style={{ backgroundImage: 'linear-gradient(90deg,#1FAB5E 55%,transparent 0)', backgroundSize: '9px 2px' }} />
                <div className="rounded-[10px] px-3 py-1.5 text-xs font-semibold border" style={{ borderColor: '#DCE4DF' }}>
                  {DEST_OPTS.find(o => o.id === destType)?.icon} {destValue || DEST_OPTS.find(o => o.id === destType)?.placeholder}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button type="button" onClick={() => setStep(4)} className="text-[13.5px] underline bg-transparent border-none" style={{ color: '#5C6B63' }}>I'll do this later</button>
              <button type="button" onClick={() => setStep(4)} className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white" style={{ background: '#1FAB5E' }}>
                Create rule →
              </button>
            </div>
          </Card>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 4 && (
          <Card>
            <div className="text-center py-4">
              <div className="w-[72px] h-[72px] rounded-full grid place-items-center text-4xl mx-auto mb-5" style={{ background: '#E4F6EC', color: '#168B4B' }}>✓</div>
              <h2 className="text-[23px] font-bold tracking-tight mb-2" style={{ color: '#14201B' }}>
                You're live{bizName ? `, ${bizName}` : ''}! 🎉
              </h2>
              <p className="text-sm mb-6 mx-auto max-w-[42ch]" style={{ color: '#5C6B63' }}>
                Messages are now forwarding to <b>{destValue || DEST_OPTS.find(o => o.id === destType)?.placeholder}</b>.
                Send yourself a WhatsApp message to test it.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button type="button" onClick={() => navigate('/app')} className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white" style={{ background: '#1FAB5E' }}>
                  Go to dashboard →
                </button>
                <button type="button" onClick={() => navigate('/app/rules')} className="rounded-[11px] px-6 py-3 text-sm font-semibold border" style={{ borderColor: '#DCE4DF', color: '#14201B' }}>
                  Add another rule
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
