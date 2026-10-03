import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

const NAV = [
  { to: '/app',          label: 'Dashboard',         icon: '▦', end: true },
  { to: '/app/inbox',    label: 'Inbox',             icon: '💬' },
  { to: '/app/rules',    label: 'Forwarding rules',  icon: '⇶' },
  { to: '/app/numbers',  label: 'Numbers',            icon: '📱' },
  { to: '/app/messages', label: 'Message logs',       icon: '≡' },
  { to: '/app/settings', label: 'Settings',           icon: '⚙' },
  { to: '/app/billing',  label: 'Plan & billing',     icon: '◈' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { currentUser, logout } = useProduct();
  const [loggingOut, setLoggingOut] = useState(false);
  // Below md the sidebar collapses into a top bar with a menu button.
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <nav
      className="w-full md:w-[228px] shrink-0 flex flex-col gap-1 px-3 py-3 md:py-5 md:min-h-screen"
      style={{ background: '#0E3B2E' }}
      aria-label="Main"
    >
      <div className="flex items-center gap-2 md:mb-5 mx-2">
        <div
          className="w-8 h-8 rounded-[9px] grid place-items-center text-white text-sm font-bold"
          style={{ background: '#1FAB5E' }}
        >
          ⇶
        </div>
        <span className="font-extrabold text-white text-[18px] tracking-tight">Sendro</span>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="md:hidden ml-auto rounded-[8px] px-3 py-1.5 text-sm font-semibold text-white border border-[#2A5447]"
          aria-expanded={menuOpen}
          aria-label="Menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      <div className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col gap-1 flex-1 mt-2 md:mt-0`}>

      {NAV.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 w-full rounded-[10px] px-3 py-2.5 text-sm font-semibold transition text-left no-underline ${
              isActive
                ? 'text-white'
                : 'text-[#9FBEB1] hover:text-white'
            }`
          }
          style={({ isActive }) => isActive ? { background: '#1FAB5E' } : undefined}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}

      <div className="mt-auto pt-3 border-t border-[#1B4A3B] flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full grid place-items-center font-bold text-xs shrink-0"
          style={{ background: '#E8A23D', color: '#3E2A05' }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-white text-xs font-semibold truncate">{currentUser?.name}</div>
          <button
            type="button"
            onClick={async () => {
              setLoggingOut(true);
              await logout();
              navigate('/');
            }}
            className="text-[#7FA294] text-xs hover:text-white transition"
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </div>
      </div>
    </nav>
  );
}
