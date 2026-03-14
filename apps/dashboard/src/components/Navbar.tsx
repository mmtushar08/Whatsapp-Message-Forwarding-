import { NavLink } from 'react-router-dom';
import HealthIndicator from './HealthIndicator';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
  }`;

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 shadow-md" style={{ backgroundColor: '#25D366' }}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">💬</span>
        <span className="text-lg font-bold text-white tracking-tight">WA Forwarder</span>
      </div>

      <div className="flex items-center gap-1">
        <NavLink to="/" end className={navLinkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/messages" className={navLinkClass}>
          Messages
        </NavLink>
        <NavLink to="/settings" className={navLinkClass}>
          Settings
        </NavLink>
      </div>

      <HealthIndicator />
    </nav>
  );
}
