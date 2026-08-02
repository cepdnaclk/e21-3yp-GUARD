import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTour } from '../../context/TourContext';
import guardLogo from '../../assets/guard-logo.png';

const BASE_NAV = [
  { to: '/demo/dashboard', label: 'Dashboard',     id: 'nav-dashboard' },
  { to: '/demo/alerts',    label: 'Notifications', id: 'nav-alerts' },
  { to: '/demo/analytics', label: 'Analytics',     id: 'nav-analytics' },
  { to: '/demo/devices',   label: 'Devices',       id: 'nav-devices' },
  { to: '/demo/fish',      label: 'Fish Info',     id: 'nav-fish' },
];

/** Shared pill styles for nav links — matches Layout.jsx design system */
const NAV_LINK_BASE =
  'px-4 py-[0.4rem] rounded-full text-[0.88rem] font-semibold no-underline transition-all duration-300 ease-out whitespace-nowrap tracking-wide select-none ' +
  'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 hover:-translate-y-0.5';

const NAV_LINK_ACTIVE =
  '!text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-[0_4px_14px_rgba(14,165,233,0.35)] dark:shadow-[0_0_18px_rgba(14,165,233,0.45)] scale-[1.02]';

/** Glass icon button styling — matches Layout.jsx design system */
const ICON_BTN =
  'w-[38px] h-[38px] bg-slate-100/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/15 rounded-xl flex items-center justify-center cursor-pointer text-slate-700 dark:text-slate-200 backdrop-blur-md text-[0.95rem] transition-all duration-200 hover:bg-slate-200/80 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white hover:scale-105 hover:shadow-md';

export default function DemoLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isTourActive } = useTour();

  useEffect(() => {
    if (isTourActive) {
      document.documentElement.classList.add('tour-active');
    } else {
      document.documentElement.classList.remove('tour-active');
    }
    return () => document.documentElement.classList.remove('tour-active');
  }, [isTourActive]);

  const navItems =
    role === 'ADMIN'
      ? [...BASE_NAV, { to: '/demo/users', label: 'Users', id: 'nav-users' }]
      : BASE_NAV;

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Top Navigation (Matches Layout.jsx design system) ── */}
      <nav className="sticky top-0 z-[9999] flex items-center px-6 min-h-[64px] flex-shrink-0 bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-colors duration-300">

        {/* Brand */}
        <div 
          onClick={() => navigate('/demo/dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <img
            src={guardLogo}
            alt="G.U.A.R.D"
            className="w-[42px] h-[42px] object-contain drop-shadow-[0_2px_8px_rgba(14,165,233,0.35)] transition-transform duration-300 group-hover:scale-105"
          />
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
            G.U.A.R.D
          </span>
          <span className="ml-1 text-xs bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-400/30 rounded-full px-2.5 py-0.5 font-bold">
            🎭 Demo
          </span>
        </div>

        {/* Each NavLink has a stable id for driver.js targeting */}
        <div className="flex items-center gap-2 ml-8 flex-1 overflow-x-auto py-2 scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              id={item.id}
              to={item.to}
              end={item.to === '/demo/dashboard'}
              className={({ isActive }) =>
                [NAV_LINK_BASE, isActive ? NAV_LINK_ACTIVE : ''].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 ml-auto flex-shrink-0">

          {/* Theme Toggle Button — Targeted by Step 7 of the tour */}
          <button
            id="tour-theme-toggle"
            className={ICON_BTN}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Profile */}
          <button
            className={ICON_BTN}
            title="Profile"
            onClick={() => navigate('/demo/profile')}
          >
            👤
          </button>

          {/* Sign Out */}
          <button
            className={ICON_BTN}
            onClick={logout}
            title="Sign out"
          >
            ⏻
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-7 flex-1 overflow-visible">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
