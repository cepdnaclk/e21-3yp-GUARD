import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const TourContext = createContext(null);

/** localStorage key scoped to the current user */
export function tourKey(userId) {
  return `guard_tour_${userId}`;
}

export function TourProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isTourActive, setIsTourActive]   = useState(false);
  const [currentStep,  setCurrentStep]    = useState(0);

  /** Returns true if the current user has already finished or skipped the tour. */
  const hasCompletedTour = useCallback(() => {
    if (!user?.id) return true; // unknown user → never show tour
    return localStorage.getItem(tourKey(user.id)) === 'true';
  }, [user]);

  /** Persist tour completion to localStorage. */
  const markTourDone = useCallback(() => {
    if (user?.id) localStorage.setItem(tourKey(user.id), 'true');
  }, [user]);

  /** Wipe the completed flag so the tour can be retaken. */
  const resetTour = useCallback(() => {
    if (user?.id) localStorage.removeItem(tourKey(user.id));
  }, [user]);

  /** Start the tour from step 0. */
  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsTourActive(true);
  }, []);

  /**
   * Skip or finish the tour:
   *   - marks it done in localStorage
   *   - deactivates the tour overlay
   *   - redirects to the live dashboard
   *
   * TourOverlay watches `isTourActive` and destroys its driver instance
   * in its own useEffect cleanup — no need to do it here.
   */
  const skipTour = useCallback(() => {
    markTourDone();
    setIsTourActive(false);
    setCurrentStep(0);
    navigate('/dashboard');
  }, [markTourDone, navigate]);

  /** Alias — finishing the tour has the same effect as skipping it. */
  const finishTour = skipTour;

  /** Called by TourOverlay to keep the shared step counter in sync. */
  const updateStep = useCallback((n) => {
    setCurrentStep(n);
  }, []);

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStep,
        hasCompletedTour,
        markTourDone,
        resetTour,
        startTour,
        skipTour,
        finishTour,
        updateStep,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
