import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MetaLoginModal from '../components/MetaLoginModal';
import { useProduct } from '../context/ProductContext';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, metaLogin } = useProduct();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const result = await signup(name, email, password);
    setSubmitting(false);
    if (!result.ok) { setError(result.error); return; }
    navigate('/onboarding');
  }

  async function handleMetaComplete(params: {
    name: string;
    accessToken: string;
    phoneNumberId: string;
    wabaId: string;
  }) {
    setShowMetaModal(false);
    setSubmitting(true);
    setError(null);
    const result = await metaLogin(params);
    setSubmitting(false);
    if (!result.ok) { setError(result.error); return; }
    navigate(result.isNewUser ? '/onboarding' : '/app');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#F4F7F4]">
      {showMetaModal && (
        <MetaLoginModal
          onClose={() => setShowMetaModal(false)}
          onComplete={handleMetaComplete}
        />
      )}

      <div className="flex items-center gap-2 font-extrabold text-[19px] tracking-tight mb-6" style={{ color: '#14201B' }}>
        <div className="w-8 h-8 rounded-[9px] grid place-items-center text-white text-sm font-bold" style={{ background: '#1FAB5E' }}>⇶</div>
        Sendro
      </div>

      <div className="w-full max-w-[430px] bg-white rounded-[14px] p-8" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
        {/* Tabs */}
        <div className="flex gap-1 rounded-[11px] p-1 mb-6" style={{ background: '#EDF1EE' }}>
          <div className="flex-1 bg-white rounded-[8px] text-center py-2.5 text-sm font-semibold" style={{ color: '#14201B', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            Create account
          </div>
          <Link to="/login" className="flex-1 text-center py-2.5 text-sm font-semibold no-underline rounded-[8px]" style={{ color: '#5C6B63' }}>
            Log in
          </Link>
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Start forwarding in minutes</h2>
        <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>Free for your first 500 messages. No card needed.</p>

        {/* Primary: Meta Business Login */}
        <button
          type="button"
          onClick={() => { setError(null); setShowMetaModal(true); }}
          disabled={submitting}
          className="w-full rounded-[11px] py-3 text-sm font-semibold text-white flex items-center justify-center gap-2.5 mb-5 disabled:opacity-60"
          style={{ background: '#1877F2' }}
        >
          <span className="w-5 h-5 rounded-full bg-white grid place-items-center font-black text-[13px] shrink-0" style={{ color: '#1877F2' }}>f</span>
          Continue with WhatsApp Business
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: '#DCE4DF' }} />
          <span className="text-xs font-medium" style={{ color: '#5C6B63' }}>or use email</span>
          <div className="flex-1 h-px" style={{ background: '#DCE4DF' }} />
        </div>

        {/* Secondary: email/password */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Your name</label>
            <input
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
              style={{ border: '1.5px solid #DCE4DF' }}
              onFocus={e => (e.target.style.borderColor = '#1FAB5E')}
              onBlur={e => (e.target.style.borderColor = '#DCE4DF')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tushar Makwana"
              required
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Work email</label>
            <input
              type="email"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
              style={{ border: '1.5px solid #DCE4DF' }}
              onFocus={e => (e.target.style.borderColor = '#1FAB5E')}
              onBlur={e => (e.target.style.borderColor = '#DCE4DF')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5" style={{ color: '#5C6B63' }}>Password</label>
            <input
              type="password"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
              style={{ border: '1.5px solid #DCE4DF' }}
              onFocus={e => (e.target.style.borderColor = '#1FAB5E')}
              onBlur={e => (e.target.style.borderColor = '#DCE4DF')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters"
              required
              minLength={8}
            />
          </div>
          {error && (
            <div className="rounded-[10px] px-4 py-3 text-sm" style={{ background: '#FBE3E2', border: '1px solid #F0CBC9', color: '#A03330' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[11px] py-3 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ background: '#1FAB5E' }}
          >
            {submitting ? 'Creating account…' : 'Create account →'}
          </button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs" style={{ color: '#5C6B63' }}>
        By continuing you agree to the{' '}
        <Link to="/terms" className="font-semibold underline" style={{ color: '#168B4B' }}>Terms</Link>
        {' '}&amp;{' '}
        <Link to="/privacy" className="font-semibold underline" style={{ color: '#168B4B' }}>Privacy Policy</Link>.
      </p>
    </div>
  );
}
