import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import guardLogo from '../assets/guard-logo.png';
import '../styles/layout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/alerts', label: 'Notifications' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/devices', label: 'Devices' },
];

export default function Layout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = role === 'SUPER_ADMIN'
    ? [{ to: '/users', label: 'Users' }] // only Users
    : role === 'ADMIN'
    ? [...NAV_ITEMS, { to: '/users', label: 'Users' }] // all pages
    : NAV_ITEMS.filter(item => item.to !== '/users'); // USER → everything except Users

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.username?.[0] ?? 'U').toUpperCase();

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <nav className="topnav">
        <div className="topnav-brand">
          <img src={guardLogo} alt="G.U.A.R.D" className="topnav-logo" />
          <span>G.U.A.R.D</span>
        </div>
        <div className="topnav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="topnav-user">
          <button className="topnav-notif" title="Profile" onClick={() => navigate('/profile')}>
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
