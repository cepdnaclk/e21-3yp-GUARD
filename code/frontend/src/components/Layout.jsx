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
      <nav className="sticky top-0 z-50 flex items-center px-6 min-h-[64px] flex-shrink-0 bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-colors duration-300">

        {/* Brand */}
        <div 
          onClick={() => navigate('/dashboard')}
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
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-2 ml-8 flex-1 overflow-x-auto py-2 scrollbar-hide">
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

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 ml-auto flex-shrink-0">

          {/* Guided Tour Button */}
          <button
            className="px-3.5 py-[0.4rem] text-[0.82rem] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/50 rounded-full backdrop-blur-md hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all duration-200 whitespace-nowrap shadow-xs hover:shadow-sm cursor-pointer"
            onClick={handleTakeTour}
            title="Restart guided tour"
          >
            🗺️ Tour
          </button>

          {/* Theme Toggle Pill */}
          <button
            className="relative w-[48px] h-[26px] bg-slate-200/80 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-full cursor-pointer flex items-center p-[2px] backdrop-blur-md hover:border-sky-400 transition-all duration-300"
            title="Toggle Theme"
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
          >
            <span className="w-[20px] h-[20px] bg-white dark:bg-sky-400 rounded-full shadow-md dark:shadow-[0_0_10px_rgba(56,189,248,0.6)] transition-transform duration-300 ease-out dark:translate-x-[22px] flex items-center justify-center text-[10px]">
              {theme === 'dark' ? '🌙' : '☀️'}
            </span>
          </button>

          {/* Profile Icon Button */}
          <button className={ICON_BTN} title="Profile" onClick={() => navigate('/profile')}>
            👤
          </button>

          {/* Logout Button */}
          <button
            className="w-[38px] h-[38px] bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 text-red-600 dark:text-red-400 cursor-pointer text-[1.2rem] rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-all duration-200 hover:scale-105 hover:shadow-md"
            onClick={logout}
            title="Sign out"
          >
            ⏻
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

