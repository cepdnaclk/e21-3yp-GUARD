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
import FishInfo from './pages/FishInfo';
import MobileAppDownload from './pages/MobileAppDownload';
import DemoPage from './pages/DemoPage';



/* ── Scrolls to top of page on every route change ── */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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

/**
 * SmartRedirect — used as the catch-all (*) route.
 * Authenticated users who haven't completed the tour go to /demo.
 * Everyone else goes to /dashboard (or /login if unauthenticated).
 */
function SmartRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  const key = `guard_tour_${user.id}`;
  const done = localStorage.getItem(key) === 'true';
  return done ? <Navigate to="/dashboard" /> : <Navigate to="/demo" />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public pages — each manages its own PublicNav */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/mobile-download" element={<MobileAppDownload />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />

        {/* Demo sandbox — full sub-tree handled inside DemoPage */}
        <Route path="/demo/*" element={<PrivateRoute><DemoPage /></PrivateRoute>} />

        {/* Production app */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/dashboard" element={<RoleRoute allowedRoles={['ADMIN', 'USER']} fallback="/users"><Dashboard /></RoleRoute>} />
          <Route path="/devices" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><Devices /></RoleRoute>} />
          <Route path="/devices/:id" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><DeviceDetail /></RoleRoute>} />
          <Route path="/analytics" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><SensorHistory /></RoleRoute>} />
          <Route path="/sensors/history" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><SensorHistory /></RoleRoute>} />
          <Route path="/alerts" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><Alerts /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} fallback="/"><Users /></RoleRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/fish" element={<RoleRoute allowedRoles={['ADMIN', 'USER', 'SUPER_ADMIN']}><FishInfo /></RoleRoute>} />
        </Route>

        {/* Smart catch-all: tour-aware redirect */}
        <Route path="*" element={<SmartRedirect />} />
      </Routes>
    </>
  );
}
