import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-white text-stone-900' : 'text-white/85 hover:bg-white/10 hover:text-white'
  }`;

export default function Navbar() {
  const navigate = useNavigate();
  const { currentUser, logout } = useProduct();
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-emerald-800/30 bg-emerald-700/95 px-6 py-4 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/15 px-3 py-2 text-white">WF</div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">
              Message Forwarding
            </div>
            <div className="text-lg font-bold text-white">WhatsApp Forwarder</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NavLink to="/app" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/app/messages" className={navLinkClass}>
            Logs
          </NavLink>
          <NavLink to="/app/settings" className={navLinkClass}>
            Settings
          </NavLink>
          <NavLink to="/app/billing" className={navLinkClass}>
            Billing
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right text-sm text-white/85 md:block">
            <div className="font-semibold">{currentUser?.name}</div>
            <div className="text-white/65">{currentUser?.email}</div>
          </div>
          <button
            type="button"
            onClick={async () => {
              setLoggingOut(true);
              await logout();
              setLoggingOut(false);
              navigate('/');
            }}
            className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </div>
    </nav>
  );
}
