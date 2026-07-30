import { useEffect, useRef, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useNavigate } from 'react-router-dom';
import { useTour } from '../../context/TourContext';
import { useAuth } from '../../context/AuthContext';
import { buildTourSteps } from '../../hooks/useTourSteps';
// tour.css is now globally imported in main.jsx (driver.js injects nodes outside React tree)

/**
 * Polls the DOM for a selector using MutationObserver — much more reliable
 * than a fixed setTimeout when navigating between routes.
 */
function waitForElement(selector, timeout = 2800) {
  return new Promise((resolve) => {
    if (!selector || selector === 'body') { resolve(document.body); return; }

    const existing = document.querySelector(selector);
    if (existing) { resolve(existing); return; }

    let settled = false;
    const settle = (el) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      resolve(el);
    };

    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) settle(found);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => settle(document.querySelector(selector) ?? null), timeout);
  });
}

export default function TourOverlay() {
  const { isTourActive, skipTour, finishTour, updateStep } = useTour();
  const { role } = useAuth();
  const navigate = useNavigate();

  // Re-compute steps whenever role changes (Admin vs User)
  const steps = buildTourSteps(role);
  const total = steps.length;

  const driverRef    = useRef(null);
  const stepRef      = useRef(0);
  const busyRef      = useRef(false);   // prevent overlapping navigations
  const cleaningRef  = useRef(false);   // prevent double-destroy callbacks
  // Forward ref so popover callbacks always call the latest activateStep
  const activateRef  = useRef(null);

  // ── Unified stop handler (skip OR finish) ──────────────────────────────
  const handleStop = useCallback((done = false) => {
    if (cleaningRef.current) return;
    cleaningRef.current = true;

    // Remove tour-active class from html element
    document.documentElement.classList.remove('tour-active');

    // Destroy driver instance
    if (driverRef.current) {
      try { driverRef.current.destroy(); } catch (_) {}
      driverRef.current = null;
    }

    if (done) finishTour();
    else      skipTour();
  }, [skipTour, finishTour]);

  // ── Core: navigate → wait for element → highlight ─────────────────────
  const activateStep = useCallback(async (idx) => {
    if (idx < 0)    { return; }
    if (idx >= total) { handleStop(true); return; }

    const drv  = driverRef.current;
    if (!drv) { busyRef.current = false; return; }

    busyRef.current = true;

    const step = steps[idx];
    stepRef.current = idx;
    updateStep(idx);

    // 1. If current route does not match step.route (forward or backward), navigate
    if (window.location.pathname !== step.route) {
      navigate(step.route);
    }

    // 2. Wait for the target element to mount in DOM
    const el = await waitForElement(step.element, 2500);

    if (!el) {
      console.warn(`[Tour] element not found: ${step.element}`);
      busyRef.current = false;
      activateRef.current?.(idx + 1);
      return;
    }

    if (!driverRef.current) {
      busyRef.current = false;
      return;
    }

    // 3. Center element in viewport before positioning highlight stage
    try {
      if (el && typeof el.scrollIntoView === 'function' && el !== document.body) {
        el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch (_) { /* ignore */ }

    busyRef.current = false;

    const isFirst = idx === 0;
    const isLast  = idx === total - 1;

    // 4. Highlight with full popover + navigation buttons
    try {
      drv.highlight({
        element: step.element,
        popover: {
          title:       step.popover.title,
          description: step.popover.description,
          side:        step.popover.side  || 'auto',
          align:       step.popover.align || 'start',
          showButtons: isFirst ? ['next', 'close'] : ['next', 'previous', 'close'],
          nextBtnText: isLast ? 'Finish 🎉' : 'Next →',
          prevBtnText: '← Back',
          doneBtnText: 'Finish 🎉',

          onNextClick: () => {
            busyRef.current = false;
            const next = stepRef.current + 1;
            if (next >= total) handleStop(true);
            else activateRef.current?.(next);
          },
          onPrevClick: () => {
            busyRef.current = false;
            const prev = stepRef.current - 1;
            if (prev >= 0) activateRef.current?.(prev);
          },
          onCloseClick: () => {
            busyRef.current = false;
            handleStop(false);
          },

          onPopoverRender: (popover) => {
            if (!popover?.wrapper) return;

            // Prominent top-right "Skip Tour ✕" button
            const existingSkip = popover.wrapper.querySelector('.tour-skip-btn');
            if (!existingSkip) {
              const skipBtn = document.createElement('button');
              skipBtn.className = 'tour-skip-btn';
              skipBtn.textContent = 'Skip Tour ✕';
              skipBtn.title = 'Exit the guided tour at any time';
              skipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                busyRef.current = false;
                handleStop(false);
              });
              popover.wrapper.appendChild(skipBtn);
            }

            if (!popover?.footerButtons) return;
            const footer = popover.footerButtons;

            // Step progress badge (e.g. "3 / 11")
            const progress = document.createElement('span');
            progress.className = 'tour-progress';
            progress.textContent = `${idx + 1} / ${total}`;
            footer.prepend(progress);

            // "↩ Step 1" shortcut (shown when not already on step 1)
            if (idx > 0) {
              const goFirst = document.createElement('button');
              goFirst.className = 'tour-goto-start-btn';
              goFirst.textContent = '↩ Step 1';
              goFirst.title = 'Go back to step 1';
              goFirst.addEventListener('click', (e) => {
                e.stopPropagation();
                busyRef.current = false;
                activateRef.current?.(0);
              });
              footer.prepend(goFirst);
            }
          },
        },
      });
    } catch (e) {
      console.warn('[Tour] highlight error:', e);
    }
  }, [steps, total, navigate, updateStep, handleStop]);

  // Keep the forward ref current
  useEffect(() => { activateRef.current = activateStep; }, [activateStep]);

  // ── Mount / unmount driver when isTourActive changes ──────────────────
  useEffect(() => {
    if (!isTourActive) {
      // Cleanup when tour ends (skipTour / finishTour already navigates away)
      document.documentElement.classList.remove('tour-active');
      if (driverRef.current) {
        cleaningRef.current = true;
        try { driverRef.current.destroy(); } catch (_) {}
        driverRef.current = null;
        cleaningRef.current = false;
      }
      return;
    }

    // Reset flags
    cleaningRef.current = false;
    busyRef.current     = false;
    stepRef.current     = 0;

    // Add tour-active so CSS elevates the topnav above the overlay
    document.documentElement.classList.add('tour-active');

    const drv = driver({
      animate:              true,
      smoothScroll:         true,
      allowClose:           false, // Tour can ONLY be closed by Skip or Finish
      overlayOpacity:       0.60,
      stagePadding:         8,
      stageRadius:          10,
      allowKeyboardControl: false,  // We handle keys ourselves
      popoverOffset:        14,

      // Overlay-level close (clicking outside the stage)
      onDestroyStarted: () => {
        if (!cleaningRef.current) handleStop(false);
      },
    });

    driverRef.current = drv;

    // Small delay so the demo dashboard has time to render #tank-grid
    const startTimer = setTimeout(() => {
      if (driverRef.current) activateRef.current?.(0);
    }, 550);

    return () => {
      clearTimeout(startTimer);
      document.documentElement.classList.remove('tour-active');
      cleaningRef.current = true;
      if (driverRef.current) {
        try { driverRef.current.destroy(); } catch (_) {}
        driverRef.current = null;
      }
    };
    // Re-create driver when tour activates or role changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTourActive, role]);

  return null;
}
