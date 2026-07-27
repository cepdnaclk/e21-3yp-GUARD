import { createContext, useContext } from 'react';
import demoData from '../data/demoData.json';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  return (
    <DemoContext.Provider
      value={{
        isDemoMode: true,
        demoDevices: demoData.devices,
        demoSensorData: demoData.sensorReadings,
        demoAlerts: demoData.alerts,
        demoUsers: demoData.users,
        demoFish: demoData.fish,
        demoSensorHistory: demoData.sensorHistory,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
