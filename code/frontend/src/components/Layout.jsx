import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import guardLogo from '../assets/guard-logo.png';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/alerts',    label: 'Notifications' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/devices',   label: 'Devices' },
  { to: '/fish',      label: 'Fish Info' },
];

/** Shared pill styles for nav links */
const NAV_LINK_BASE =
  'px-4 py-[0.4rem] rounded-full text-[0.88rem] font-semibold no-underline transition-all duration-300 ease-out whitespace-nowrap tracking-wide select-none ' +
  'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 hover:-translate-y-0.5';

const NAV_LINK_ACTIVE =
  '!text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-[0_4px_14px_rgba(14,165,233,0.35)] dark:shadow-[0_0_18px_rgba(14,165,233,0.45)] scale-[1.02]';

/** Glass icon button styling */
const ICON_BTN =
  'w-[38px] h-[38px] bg-slate-100/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/15 rounded-xl flex items-center justify-center cursor-pointer text-slate-700 dark:text-slate-200 backdrop-blur-md text-[0.95rem] transition-all duration-200 hover:bg-slate-200/80 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white hover:scale-105 hover:shadow-md';

export default function Layout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  function handleTakeTour() {
    if (user?.id) {
      localStorage.removeItem(`guard_tour_${user.id}`);
    }
    navigate('/demo');
  }

  const navItems = role === 'SUPER_ADMIN'
    ? [{ to: '/users', label: 'Users' }, { to: '/fish', label: 'Fish Info' }]
    : role === 'ADMIN'
    ? [...NAV_ITEMS, { to: '/users', label: 'Users' }]
    : NAV_ITEMS.filter(item => item.to !== '/users');

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-[9999] flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 px-6 py-2.5 min-h-[64px] flex-shrink-0 bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-colors duration-300">

        {/* Brand */}
        <div 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group select-none flex-shrink-0"
        >
          <img
            src={guardLogo}
            alt="G.U.A.R.D"
            className="w-[42px] h-[42px] object-contain drop-shadow-[0_2px_8px_rgba(14,165,233,0.35)] transition-transform duration-300 group-hover:scale-105"
          />
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
            G.U.A.R.D
          </span>
        </div>

        {/* Nav Links — Appears directly after Brand */}
        <div className="flex flex-wrap items-center gap-2 ml-4 flex-1 max-[850px]:w-full max-[850px]:ml-0 max-[850px]:justify-center py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                [NAV_LINK_BASE, isActive ? NAV_LINK_ACTIVE : ''].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right Controls — Always pinned to the far right */}
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-nowrap ml-auto">

          {/* Guided Tour Button */}
          <button
            className="px-3.5 py-[0.4rem] text-[0.82rem] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/50 rounded-full backdrop-blur-md hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all duration-200 whitespace-nowrap shadow-xs hover:shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            onClick={handleTakeTour}
            title="Restart guided tour"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M 9 18 L 3 15 V 3 L 9 6 M 9 18 L 15 21 V 9 L 9 6 M 9 18 V 6 M 15 21 L 21 18 V 6 L 15 9 M 15 21 V 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Tour</span>
          </button>

          {/* Theme Toggle Button matching IO Page */}
          <button
            id="tour-theme-toggle"
            className="w-[36px] h-[36px] bg-slate-100/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/15 rounded-xl flex items-center justify-center cursor-pointer text-slate-600 dark:text-slate-200 backdrop-blur-md transition-all duration-200 hover:bg-slate-200/80 dark:hover:bg-white/20 hover:text-sky-500 dark:hover:text-sky-400 hover:rotate-[15deg] hover:scale-105"
            title="Toggle theme"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                <path d="M 17.29 13.29 A 8 8 0 1 1 6.71 2.71 A 6.5 6.5 0 0 0 17.29 13.29 Z" fill="currentColor"/>
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                <circle cx="10" cy="10" r="4" fill="currentColor"/>
                <path d="M 10 2 V 4 M 10 16 V 18 M 2 10 H 4 M 16 10 H 18 M 4.34 4.34 L 5.76 5.76 M 14.24 14.24 L 15.66 15.66 M 4.34 15.66 L 5.76 14.24 M 14.24 5.76 L 15.66 4.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* Profile Icon Button */}
          <button className={ICON_BTN} title="Profile" onClick={() => navigate('/profile')}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M 20 21 v -2 a 4 4 0 0 0 -4 -4 H 8 a 4 4 0 0 0 -4 4 v 2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>

          {/* Logout Button */}
          <button
            className="w-[38px] h-[38px] bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 text-red-600 dark:text-red-400 cursor-pointer rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-all duration-200 hover:scale-105 hover:shadow-md"
            onClick={logout}
            title="Sign out"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
          </button>
        </div>
      </nav>

      {/* Page View Container */}
      <div className="flex-1 flex flex-col">
        <div className="p-7 flex-1 overflow-visible">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

