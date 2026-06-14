import { useState } from 'react';

export interface MetaLoginResult {
  name: string;
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
}

interface Props {
  onClose: () => void;
  onComplete: (result: MetaLoginResult) => void;
}

// ─── AFTER META APP APPROVAL — swap in real FB.login() ───────────────────────
// In handleFinish() below, replace the demo credential block with:
//
//   window.FB.login((response) => {
//     if (!response.authResponse?.accessToken) return;
//     accessTokenRef.current = response.authResponse.accessToken;
//     // Steps 2-5 become the real Meta popup — just wait for postMessage FINISH.
//   }, { config_id: import.meta.env.VITE_META_CONFIG_ID, response_type: 'code',
//        override_default_response_type: true, extras: { sessionInfoVersion: 2 } });
//
// Then in the window message listener, call onComplete() with real tokens.
// ─────────────────────────────────────────────────────────────────────────────

const Foot = ({
  back, next, nextLabel = 'Next', nextDisabled = false,
}: {
  back?: () => void;
  next: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) => (
  <div className="flex justify-end gap-2.5 pt-4">
    {back && (
      <button
        type="button"
        onClick={back}
        className="rounded-[9px] px-4 py-2 text-sm font-semibold border"
        style={{ borderColor: '#dde3e8', color: '#1c2b33' }}
      >
        Back
      </button>
    )}
    <button
      type="button"
      onClick={next}
      disabled={nextDisabled}
      className="rounded-[9px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      style={{ background: '#1877F2' }}
    >
      {nextLabel}
    </button>
  </div>
);

export default function MetaLoginModal({ onClose, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  function handleFinish() {
    // TEMPORARY: build demo credentials from the phone number the user entered.
    // After Meta app approval, replace this with real FB.login() tokens.
    const digits = phone.replace(/\D/g, '');
    const phoneNumberId = `demo_${digits}`;
    const wabaId = `waba_demo_${digits}`;
    const accessToken = 'DEMO_META_TOKEN';

    setStep(6);
    setTimeout(() => {
      onComplete({ name, accessToken, phoneNumberId, wabaId });
    }, 1000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,20,16,.55)' }}
    >
      <div
        className="w-full max-w-[480px] bg-white rounded-[12px] overflow-hidden"
        style={{ boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#1877F2' }}>
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <span
              className="w-6 h-6 rounded-full bg-white grid place-items-center font-black text-[14px]"
              style={{ color: '#1877F2' }}
            >
              f
            </span>
            Meta · WhatsApp Business Login
          </div>
          <button type="button" onClick={onClose} className="text-white text-xl leading-none bg-transparent border-none">×</button>
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">
              STEP 1 OF 5 · YOUR ACCOUNT
            </div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>
              Connect with WhatsApp Business
            </h3>
            <p className="text-[13.5px] mb-5" style={{ color: '#65766e' }}>
              Sendro will receive access to manage your WhatsApp Business Account.
            </p>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-[0.05em] mb-1.5" style={{ color: '#65766e' }}>
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Tushar Makwana"
                className="w-full rounded-[8px] px-3 py-2.5 text-sm outline-none"
                style={{ border: '1.5px solid #dde3e8' }}
                autoFocus
              />
            </div>
            <Foot next={() => setStep(2)} nextLabel="Continue" nextDisabled={!name.trim()} />
          </div>
        )}

        {/* Step 2 — Business Portfolio */}
        {step === 2 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">
              STEP 2 OF 5 · BUSINESS PORTFOLIO
            </div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>Choose a business portfolio</h3>
            <p className="text-[13.5px] mb-4" style={{ color: '#65766e' }}>
              Select the Meta Business Portfolio that owns your WhatsApp account.
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { icon: '🏢', name: 'My Business Portfolio', sub: 'Meta Business ID · Selected', on: true },
                { icon: '＋', name: 'Create a new business portfolio', sub: '', on: false },
              ].map(item => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 p-3.5 rounded-[10px] border"
                  style={{ borderColor: item.on ? '#1877F2' : '#dde3e8', background: item.on ? '#F0F6FE' : '#fff' }}
                >
                  <div className="w-9 h-9 rounded-[9px] bg-[#E7EDF2] grid place-items-center text-lg shrink-0">{item.icon}</div>
                  <div>
                    <div className="font-bold text-sm">{item.name}</div>
                    {item.sub && <div className="text-xs" style={{ color: '#65766e' }}>{item.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
            <Foot back={() => setStep(1)} next={() => setStep(3)} />
          </div>
        )}

        {/* Step 3 — WhatsApp Business Account */}
        {step === 3 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">
              STEP 3 OF 5 · WHATSAPP BUSINESS ACCOUNT
            </div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>Select a WhatsApp Business Account</h3>
            <p className="text-[13.5px] mb-4" style={{ color: '#65766e' }}>
              Pick an existing account or create a new one.
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { icon: '💬', name: 'My WhatsApp Business Account', sub: 'Connected to your portfolio', on: true },
                { icon: '＋', name: 'Create a new WhatsApp Business Account', sub: '', on: false },
              ].map(item => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 p-3.5 rounded-[10px] border"
                  style={{ borderColor: item.on ? '#1877F2' : '#dde3e8', background: item.on ? '#F0F6FE' : '#fff' }}
                >
                  <div className="w-9 h-9 rounded-[9px] bg-[#E7EDF2] grid place-items-center text-lg shrink-0">{item.icon}</div>
                  <div>
                    <div className="font-bold text-sm">{item.name}</div>
                    {item.sub && <div className="text-xs" style={{ color: '#65766e' }}>{item.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
            <Foot back={() => setStep(2)} next={() => setStep(4)} />
          </div>
        )}

        {/* Step 4 — Business Phone Number */}
        {step === 4 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">
              STEP 4 OF 5 · BUSINESS PHONE NUMBER
            </div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>Enter your business phone number</h3>
            <p className="text-[13.5px] mb-4" style={{ color: '#65766e' }}>
              This is the WhatsApp Business number you want to connect to Sendro.
            </p>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-[0.05em] mb-1.5" style={{ color: '#65766e' }}>
                WhatsApp Business number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-[8px] px-3 py-2.5 text-sm font-mono outline-none"
                style={{ border: '1.5px solid #dde3e8' }}
                autoFocus
              />
              <p className="mt-2 text-[12px]" style={{ color: '#65766e' }}>
                Include the country code (e.g. +91 for India, +1 for US).
              </p>
            </div>
            <Foot back={() => setStep(3)} next={() => setStep(5)} nextDisabled={!phone.trim()} />
          </div>
        )}

        {/* Step 5 — Permissions */}
        {step === 5 && (
          <div className="p-6">
            <div className="font-mono text-[11px] text-[#65766e] uppercase tracking-[0.1em] mb-2">
              STEP 5 OF 5 · PERMISSIONS
            </div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>What Sendro is allowed to do</h3>
            <p className="text-[13.5px] mb-4" style={{ color: '#65766e' }}>
              You can review or revoke these permissions anytime in Meta Business settings.
            </p>
            {[
              `Receive incoming messages on ${phone} via webhooks`,
              'Read your WhatsApp Business Account profile & phone numbers',
              'Send messages on your behalf (for forwarding rules)',
              'Manage message templates',
            ].map(p => (
              <div key={p} className="flex gap-2.5 text-[13.5px] mb-2.5" style={{ color: '#3b4a43' }}>
                <span className="font-black shrink-0" style={{ color: '#1877F2' }}>✓</span>
                {p}
              </div>
            ))}
            <Foot back={() => setStep(4)} next={handleFinish} nextLabel="Connect & sign in" />
          </div>
        )}

        {/* Step 6 — Connecting */}
        {step === 6 && (
          <div className="p-6 text-center">
            <div
              className="w-16 h-16 rounded-full grid place-items-center text-3xl mx-auto mb-4"
              style={{ background: '#E4F6EC', color: '#168B4B' }}
            >
              ✓
            </div>
            <h3 className="text-[18px] font-bold mb-1.5" style={{ color: '#1c2b33' }}>Connected!</h3>
            <p className="text-[13.5px]" style={{ color: '#65766e' }}>
              {phone} is now linked to Sendro.<br />Signing you in…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
