import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing/Landing';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import SensorHistory from './pages/SensorHistory';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import Users from './pages/Users';
import VerifyEmail from './pages/VerifyEmail';
import About from './pages/Landing/About';

/* ── Scrolls to top of page on every route change ── */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

/* ── Triggers page-fade-enter animation on every route change ── */
function PageTransition() {
  const { pathname } = useLocation();
  const bodyRef = useRef(document.body);

  useEffect(() => {
    const body = bodyRef.current;
    body.classList.remove('page-fade-enter');
    // force reflow so the class removal is committed before re-adding
    void body.offsetHeight;
    body.classList.add('page-fade-enter');
    const cleanup = () => body.classList.remove('page-fade-enter');
    const t = setTimeout(cleanup, 500);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? <Navigate to="/dashboard" /> : children;
}

function RoleRoute({ children, allowedRoles, fallback = '/' }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!role || !allowedRoles.includes(role)) return <Navigate to={fallback} />;
  return children;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <PageTransition />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/dashboard" element={<RoleRoute allowedRoles={['ADMIN', 'USER']} fallback="/users"><Dashboard /></RoleRoute>} />
          <Route path="/devices" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><Devices /></RoleRoute>} />
          <Route path="/devices/:id" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><DeviceDetail /></RoleRoute>} />
          <Route path="/analytics" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><SensorHistory /></RoleRoute>} />
          <Route path="/alerts" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><Alerts /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} fallback="/"><Users /></RoleRoute>} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  );
}
