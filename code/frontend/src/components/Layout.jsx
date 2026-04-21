import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import guardLogo from '../assets/guard-logo.png';
import '../styles/layout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/alerts', label: 'Notifications' },
  { to: '/sensors/history', label: 'Analytics' },
  { to: '/devices', label: 'Devices' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);

  const handleAlert = useCallback((alert) => {
    const toast = { ...alert, _id: Date.now() + Math.random() };
    setToasts((prev) => [toast, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t._id !== toast._id));
    }, 8000);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('alert', handleAlert);
      return () => socket.off('alert', handleAlert);
    }
  }, [handleAlert]);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t._id !== id));
  };

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
          {NAV_ITEMS.map((item) => (
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

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t._id} className="toast" onClick={() => dismissToast(t._id)} style={{ cursor: 'pointer' }}>
              <div className="toast-title">🚨 {t.type}</div>
              <div className="toast-body">{t.message} — Device {t.deviceUid}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
