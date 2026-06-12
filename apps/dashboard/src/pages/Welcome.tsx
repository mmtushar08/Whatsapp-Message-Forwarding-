import { Link } from 'react-router-dom';

function RouteDemo({ msg, dest }: { msg: string; dest: string }) {
  return (
    <div className="flex items-center gap-3 mt-3 first:mt-0">
      <div
        className="rounded-[14px_14px_14px_4px] px-3 py-2 text-sm max-w-[260px]"
        style={{ background: '#173F33', border: '1px solid #26604D', color: '#D9EFE3' }}
      >
        {msg} <span style={{ color: '#4FB6EC', fontWeight: 800, letterSpacing: -3 }}>✓✓</span>
      </div>
      <div className="flex-1 h-0.5 relative" style={{ backgroundImage: 'linear-gradient(90deg,#1FAB5E 55%,transparent 0)', backgroundSize: '9px 2px' }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 border-[5px] border-transparent border-l-[#1FAB5E]" />
      </div>
      <div
        className="rounded-[10px] px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
        style={{ background: '#0A2C22', border: '1.5px solid #26604D', color: '#D9EFE3' }}
      >
        {dest}
      </div>
    </div>
  );
}

export default function Welcome() {
  return (
    <div className="min-h-screen bg-[#F4F7F4]">
      {/* Hero */}
      <div style={{ background: '#0E3B2E' }} className="rounded-b-[36px] px-6 pt-0 pb-16">
        <div className="max-w-[1020px] mx-auto">
          {/* Top bar */}
          <div className="flex justify-between items-center py-5 mb-10">
            <div className="flex items-center gap-2 font-extrabold text-[19px] text-white tracking-tight">
              <div className="w-8 h-8 rounded-[9px] grid place-items-center text-white text-sm font-bold" style={{ background: '#1FAB5E' }}>⇶</div>
              Sendro
            </div>
            <div className="flex gap-2.5">
              <Link to="/login" className="rounded-[11px] px-4 py-2 text-sm font-semibold text-[#EAF4EE] border border-[#2A5447] hover:bg-[#1B4A3B] transition no-underline">Log in</Link>
              <Link to="/signup" className="rounded-[11px] px-4 py-2 text-sm font-semibold text-white transition no-underline" style={{ background: '#1FAB5E' }}>Start free</Link>
            </div>
          </div>

          <h1 className="text-[clamp(34px,5.4vw,58px)] leading-[1.05] font-extrabold tracking-[-0.03em] text-white max-w-[13ch]">
            Every WhatsApp message, exactly where your team works.
          </h1>
          <p className="mt-5 mb-7 text-[#A9C6B9] text-lg max-w-[54ch]">
            Sendro connects your WhatsApp Business number in two minutes and forwards every incoming message to email, webhooks, Slack, or another number — with delivery you can audit.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/signup" className="rounded-[11px] px-5 py-3 text-sm font-semibold text-white no-underline" style={{ background: '#1FAB5E' }}>
              Connect your number →
            </Link>
            <Link to="/login" className="rounded-[11px] px-5 py-3 text-sm font-semibold text-[#EAF4EE] border border-[#2A5447] hover:bg-[#1B4A3B] transition no-underline">
              View live demo
            </Link>
          </div>

          {/* Route demo */}
          <div className="mt-12 rounded-[18px] p-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <RouteDemo msg='"Hi, is the 2BHK on SG Highway still available?"' dest='✉️ sales@acmerealty.in' />
            <RouteDemo msg='"Order #4413 — please change delivery slot"' dest='⚙️ POST /webhooks/orders' />
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-[1020px] mx-auto -mt-10 px-6 pb-16 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
        {[
          { key: 'Setup', title: 'Official Meta signup', desc: "Connect through Meta's embedded signup — no QR hacks, no banned numbers, fully Cloud API native." },
          { key: 'Routing', title: 'Rules, not chaos', desc: 'Route by keyword, sender, or business hours. One number can feed five teams.' },
          { key: 'Trust', title: 'Audit-grade logs', desc: 'Every forward is logged with delivery status, latency, and payload — exportable any time.' },
        ].map((f) => (
          <div key={f.key} className="bg-white rounded-[14px] p-6" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: '#168B4B' }}>{f.key}</div>
            <h3 className="font-semibold text-[16px] mb-1.5 tracking-tight" style={{ color: '#14201B' }}>{f.title}</h3>
            <p className="text-[13.5px]" style={{ color: '#5C6B63' }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="max-w-[1020px] mx-auto px-6 pb-10 flex flex-wrap items-center justify-between gap-3 text-sm" style={{ color: '#5C6B63' }}>
        <span>© {new Date().getFullYear()} Sendro</span>
        <div className="flex gap-5">
          <Link to="/pricing" className="no-underline hover:underline" style={{ color: '#5C6B63' }}>Pricing</Link>
          <Link to="/privacy" className="no-underline hover:underline" style={{ color: '#5C6B63' }}>Privacy Policy</Link>
          <Link to="/terms" className="no-underline hover:underline" style={{ color: '#5C6B63' }}>Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
