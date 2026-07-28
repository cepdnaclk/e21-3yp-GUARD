import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import guardLogo from '../assets/guard-logo.png';
// layout.css migrated to Tailwind below. tour.css moved to main.jsx (global).

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/alerts',    label: 'Notifications' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/devices',   label: 'Devices' },
  { to: '/fish',      label: 'Fish Info' },
];

/** Shared pill styles for nav links */
const NAV_LINK_BASE =
  'px-4 py-[0.35rem] rounded-full border border-white/12 text-white/78 text-[0.88rem] font-medium no-underline transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] whitespace-nowrap backdrop-blur-[4px] tracking-[0.01em] hover:bg-white/10 hover:border-white/25 hover:text-white hover:-translate-y-px';
const NAV_LINK_ACTIVE =
  'bg-primary/22 border-sky-400/50 text-white shadow-[0_0_14px_rgba(14,165,233,0.20)]';

/** Small glass icon button used for profile / logout / tour */
const ICON_BTN =
  'w-[34px] h-[34px] bg-white/10 border border-white/15 rounded-lg flex items-center justify-center cursor-pointer text-[#f0f6fc] backdrop-blur-[4px] text-[0.85rem] transition-all duration-200 hover:bg-white/[0.18] hover:border-white/30 hover:scale-105';

export default function Layout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  /** Reset tour flag and send user to /demo to retake the tour */
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
    // .app-layout → flex flex-col min-h-screen
    <div className="flex flex-col min-h-screen">

      {/* ── Top Navigation ── */}
      {/*
        .topnav →
          sticky top-0 z-50
          glass: bg-[rgba(1,35,61,0.78)] dark:bg-[rgba(8,14,24,0.82)]
          backdrop-blur-2xl border-b border-white/8 dark:border-white/6
          shadow-[0_4px_24px_rgba(0,0,0,0.18)]
      */}
      <nav className="sticky top-0 z-50 flex items-center px-7 min-h-[62px] flex-shrink-0 bg-gradient-to-r from-[rgba(1,30,55,0.82)] to-[rgba(2,52,96,0.76)] dark:from-[rgba(4,12,28,0.88)] dark:to-[rgba(6,18,40,0.82)] backdrop-blur-xl border-b border-sky-400/20 dark:border-sky-500/10 shadow-[0_2px_20px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)]">

        {/* Brand — .topnav-brand */}
        <div className="flex items-center gap-0 text-[#f0f6fc] font-bold text-2xl tracking-[0.08em]">
          <img
            src={guardLogo}
            alt="G.U.A.R.D"
            className="w-[50px] h-[50px] object-contain drop-shadow-[0_0_6px_rgba(14,165,233,0.4)]"
          />
          <span>G.U.A.R.D</span>
        </div>

        {/* Nav Links — .topnav-links */}
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

        {/* Right-side controls — .topnav-user */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">

          {/* Take a Tour — .take-tour-btn */}
          <button
            className="px-3 py-[0.35rem] text-[0.82rem] font-semibold text-white/80 bg-white/8 border border-white/12 rounded-full backdrop-blur-[4px] hover:bg-white/14 hover:text-white transition-all duration-200 whitespace-nowrap"
            onClick={handleTakeTour}
            title="Restart the guided onboarding tour"
          >
            🗺️ Tour
          </button>

          {/*
            Theme Toggle — .theme-toggle-switch / .theme-toggle-circle
            The circle slides right in dark mode via dark:translate-x-5
          */}
          <button
            className="relative w-[46px] h-[26px] bg-white/10 dark:bg-primary/12 border-2 border-white/25 dark:border-sky-400/40 rounded-full cursor-pointer flex items-center mr-2 backdrop-blur-[4px] hover:bg-white/16 hover:border-white/40 transition-all duration-300"
            title="Toggle Theme"
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
          >
            <span className="w-[18px] h-[18px] bg-white/90 dark:bg-sky-400 rounded-full ml-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.3)] dark:shadow-[0_0_8px_rgba(56,189,248,0.6)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:translate-x-5" />
          </button>

          {/* Profile — .topnav-notif */}
          <button className={ICON_BTN} title="Profile" onClick={() => navigate('/profile')}>
            👤
          </button>

          {/* Logout — .topnav-logout */}
          <button
            className="bg-white/8 border border-white/12 text-white/78 cursor-pointer text-[1.6rem] px-[0.35rem] py-[0.1rem] rounded-lg leading-none hover:text-sky-400 hover:bg-sky-400/12 hover:border-sky-400/30 transition-all duration-200"
            onClick={logout}
            title="Sign out"
          >
            ⏻
          </button>
        </div>
      </nav>

      {/* Page Content — .main-content / .page-content */}
      <div className="flex-1 flex flex-col">
        <div className="p-7 flex-1 overflow-visible">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
