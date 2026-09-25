import { Link, NavLink } from 'react-router-dom';
import ControllerStatus from './ControllerStatus';
import AccountStatus from './AccountStatus';

function LogoIcon() {
  return (
    <svg className="np-logo-icon" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="np-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="0.5" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="none" stroke="url(#np-logo-grad)" strokeWidth="3" />
      <path d="M13 10.5 L22 16 L13 21.5 Z" fill="url(#np-logo-grad)" />
    </svg>
  );
}

export default function NavBar() {
  return (
    <nav className="np-nav">
      <Link to="/" className="np-logo">
        <LogoIcon />
        Next Player
      </Link>
      <div className="np-links">
        <NavLink to="/" end>Games</NavLink>
        <NavLink to="/help">How to Play</NavLink>
        <NavLink to="/chat">Chat</NavLink>
        <NavLink to="/controller">Controller</NavLink>
      </div>
      <div className="np-nav-status">
        <AccountStatus />
        <ControllerStatus />
      </div>
    </nav>
  );
}
