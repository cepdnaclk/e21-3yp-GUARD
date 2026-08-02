import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTour } from '../../context/TourContext';
import guardLogo from '../../assets/guard-logo.png';
// layout.css migrated to Tailwind below. tour.css is in main.jsx (global).

const BASE_NAV = [
  { to: '/demo/dashboard', label: 'Dashboard',     id: 'nav-dashboard' },
  { to: '/demo/alerts',    label: 'Notifications', id: 'nav-alerts' },
  { to: '/demo/analytics', label: 'Analytics',     id: 'nav-analytics' },
  { to: '/demo/devices',   label: 'Devices',       id: 'nav-devices' },
  { to: '/demo/fish',      label: 'Fish Info',     id: 'nav-fish' },
];

const NAV_LINK_BASE =
  'px-4 py-[0.35rem] rounded-full border border-white/12 text-white/78 text-[0.88rem] font-medium no-underline transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] whitespace-nowrap backdrop-blur-[4px] tracking-[0.01em] hover:bg-white/10 hover:border-white/25 hover:text-white hover:-translate-y-px';
const NAV_LINK_ACTIVE =
  'bg-primary/22 border-sky-400/50 text-white shadow-[0_0_14px_rgba(14,165,233,0.20)]';

export default function DemoLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { skipTour, isTourActive } = useTour();

  /**
   * Keeps the `tour-active` class on <html> in sync with isTourActive.
   * This lets CSS elevate the topnav z-index above the driver.js overlay,
   * so the active NavLink (and theme toggle) are always visible.
   */
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

      {/* ── Top Navigation ── */}
      <nav className="sticky top-0 z-[9999] flex items-center px-7 min-h-[62px] flex-shrink-0 bg-[rgba(1,35,61,0.78)] dark:bg-[rgba(8,14,24,0.82)] backdrop-blur-2xl border-b border-white/[0.08] dark:border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.18)]">

        {/* Brand */}
        <div className="flex items-center gap-0 text-[#f0f6fc] font-bold text-2xl tracking-[0.08em]">
          <img
            src={guardLogo}
            alt="G.U.A.R.D"
            className="w-[50px] h-[50px] object-contain drop-shadow-[0_0_6px_rgba(14,165,233,0.4)]"
          />
          <span>G.U.A.R.D</span>
          {/* .demo-mode-badge */}
          <span className="ml-2 text-xs bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full px-2 py-0.5 font-bold">
            🎭 Demo
          </span>
        </div>

        {/* Each NavLink has a stable id so tour steps can target them */}
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
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">

          {/* Exit demo */}
          <button
            className="px-3 py-[0.35rem] text-[0.82rem] font-semibold text-white/80 bg-white/8 border border-white/12 rounded-full backdrop-blur-[4px] hover:bg-white/14 hover:text-white transition-all duration-200 whitespace-nowrap"
            onClick={skipTour}
            title="Exit demo and go to your live dashboard"
          >
            ✕ Exit Demo
          </button>

          {/* id="tour-theme-toggle" — targeted by Step 7 of the tour */}
          <button
            id="tour-theme-toggle"
            className="relative w-[46px] h-[26px] bg-white/10 dark:bg-primary/12 border-2 border-white/25 dark:border-sky-400/40 rounded-full cursor-pointer flex items-center mr-2 backdrop-blur-[4px] hover:bg-white/16 hover:border-white/40 transition-all duration-300"
            title="Toggle Light / Dark mode"
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
          >
            <span className="w-[18px] h-[18px] bg-white/90 dark:bg-sky-400 rounded-full ml-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.3)] dark:shadow-[0_0_8px_rgba(56,189,248,0.6)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:translate-x-5" />
          </button>

          <button
            className="w-[34px] h-[34px] bg-white/10 border border-white/15 rounded-lg flex items-center justify-center cursor-pointer text-[#f0f6fc] backdrop-blur-[4px] text-[0.85rem] hover:bg-white/[0.18] hover:border-white/30 hover:scale-105 transition-all duration-200"
            title="Profile"
            onClick={() => navigate('/demo/profile')}
          >
            👤
          </button>

          <button
            className="bg-white/8 border border-white/12 text-white/78 cursor-pointer text-[1.6rem] px-[0.35rem] py-[0.1rem] rounded-lg leading-none hover:text-sky-400 hover:bg-sky-400/12 hover:border-sky-400/30 transition-all duration-200"
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
