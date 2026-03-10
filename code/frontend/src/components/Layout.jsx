import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/devices', label: 'Devices', icon: '📡' },
  { to: '/sensors/history', label: 'Sensor History', icon: '📈' },
  { to: '/alerts', label: 'Alerts', icon: '🚨' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [toasts, setToasts] = useState([]);

  // Page title from current route
  const currentPage = NAV_ITEMS.find((n) => n.to === location.pathname)?.label || 'G.U.A.R.D';

  // WebSocket alert listener
  const handleAlert = useCallback((alert) => {
    const toast = { ...alert, _id: Date.now() + Math.random() };
    setToasts((prev) => [toast, ...prev].slice(0, 5));
    // Auto-dismiss after 8 seconds
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

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>G.U.A.R.D</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
            {user?.fullName || user?.username}
          </div>
          <button onClick={logout}>Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <h2>{currentPage}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {user?.username}
          </span>
        </header>
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
              <div className="toast-body">
                {t.message} — Device {t.deviceUid}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
