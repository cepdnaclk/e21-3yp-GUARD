import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import SensorHistory from './pages/SensorHistory';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? <Navigate to="/" /> : children;
}

function RoleRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/devices" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><Devices /></RoleRoute>} />
        <Route path="/devices/:id" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><DeviceDetail /></RoleRoute>} />
        <Route path="/sensors/history" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><SensorHistory /></RoleRoute>} />
        <Route path="/alerts" element={<RoleRoute allowedRoles={['ADMIN', 'USER']}><Alerts /></RoleRoute>} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
