import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DemoProvider } from '../context/DemoContext';
import { TourProvider } from '../context/TourContext';
import { useTour } from '../context/TourContext';
import DemoLayout from '../components/demo/DemoLayout';
import TourOverlay from '../components/tour/TourOverlay';
import DashboardDemo from './demo/DashboardDemo';
import DevicesDemo from './demo/DevicesDemo';
import SensorHistoryDemo from './demo/SensorHistoryDemo';
import AlertsDemo from './demo/AlertsDemo';
import FishInfoDemo from './demo/FishInfoDemo';
import UsersDemo from './demo/UsersDemo';
import ProfileDemo from './demo/ProfileDemo';
import { useAuth } from '../context/AuthContext';

/**
 * Inner component — needs to be inside TourProvider to call useTour.
 * Auto-starts the tour as soon as the demo page mounts.
 */
function DemoInner() {
  const { startTour, isTourActive } = useTour();
  const { role } = useAuth();

  useEffect(() => {
    // Small delay so the dashboard has time to render its elements
    const t = setTimeout(() => {
      if (!isTourActive) startTour();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DemoProvider>
      <Routes>
        <Route element={<DemoLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardDemo />} />
          <Route path="devices"   element={<DevicesDemo />} />
          <Route path="analytics" element={<SensorHistoryDemo />} />
          <Route path="alerts"    element={<AlertsDemo />} />
          <Route path="fish"      element={<FishInfoDemo />} />
          <Route path="profile"   element={<ProfileDemo />} />
          {role === 'ADMIN' && <Route path="users" element={<UsersDemo />} />}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
      {/* Tour overlay lives at this level so it persists across route changes */}
      <TourOverlay />
    </DemoProvider>
  );
}

/**
 * DemoPage — the `/demo` route entry point.
 * Wraps everything in TourProvider.
 */
export default function DemoPage() {
  return (
    <TourProvider>
      <DemoInner />
    </TourProvider>
  );
}
