import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTour } from '../../context/TourContext';
import guardLogo from '../../assets/guard-logo.png';
import '../../styles/layout.css';
import '../../styles/tour.css';

const BASE_NAV = [
  { to: '/demo/dashboard', label: 'Dashboard',     id: 'nav-dashboard' },
  { to: '/demo/alerts',    label: 'Notifications', id: 'nav-alerts' },
  { to: '/demo/analytics', label: 'Analytics',     id: 'nav-analytics' },
  { to: '/demo/devices',   label: 'Devices',       id: 'nav-devices' },
  { to: '/demo/fish',      label: 'Fish Info',     id: 'nav-fish' },
];

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
    <div className="app-layout">
      {/* Top Navigation */}
      <nav className="topnav">
        <div className="topnav-brand">
          <img src={guardLogo} alt="G.U.A.R.D" className="topnav-logo" />
          <span>G.U.A.R.D</span>
          <span className="demo-mode-badge">🎭 Demo</span>
        </div>

        {/* Each NavLink has a stable id so tour steps can target them */}
        <div className="topnav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              id={item.id}
              to={item.to}
              end={item.to === '/demo/dashboard'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="topnav-user">
          {/* Exit demo */}
          <button
            className="take-tour-btn"
            onClick={skipTour}
            title="Exit demo and go to your live dashboard"
            style={{ marginRight: 6 }}
          >
            ✕ Exit Demo
          </button>

          {/* id="tour-theme-toggle" — targeted by Step 7 of the tour */}
          <button
            id="tour-theme-toggle"
            className="theme-toggle-switch"
            title="Toggle Light / Dark mode"
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
          >
            <span className="theme-toggle-circle" />
          </button>

          <button className="topnav-notif" title="Profile" onClick={() => navigate('/demo/profile')}>
            👤
          </button>
          <button className="topnav-logout" onClick={logout} title="Sign out">
            ⏻
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <div className="main-content">
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
