# Ash-Doc: Documentation of System Enhancements & Fixes

This document outlines the updates, enhancements, and bug fixes implemented during this session for the G.U.A.R.D platform.

---

## 1. Backend & Infrastructure Verification
- **Verification Script**: Created [check-services.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/check-services.js) to automate connection health checks for crucial cloud infrastructure:
  - **MongoDB**: Database connectivity validation.
  - **InfluxDB**: Time-series health status.
  - **MQTT Broker**: Pub-Sub connection readiness.
  - **SMTP Transporter**: Email notification service.
- **Service Restart**: Restructured services using local startup utilities to ensure all backends are up and synchronized.

---

## 2. Advanced UX & UI Animations
We introduced a premium design feel using curated modern colors, glassmorphism, dynamic transitions, and responsiveness:
- **Shared Animation Library**: Created [animations.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/utils/animations.jsx) containing reusable components:
  - `<ScrollProgress />`: A top-anchored indicator tracking page scroll position.
  - `<Reveal />`: Uses the `IntersectionObserver` API to animate cards and blocks into view with directional fade-ins (`up`, `left`, `right`, `scale`).
- **Hero & Landing Enhancements** ([Landing.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/Landing/Landing.jsx)):
  - Added particle systems (`HeroParticles`) that float in the background.
  - Hero text elements use a staggered delay for a clean entrance animation.
  - Interactive elements feature card shimmers, glow pulses on hover, and custom scroll-down bounce indicators.
- **About Page Revamp** ([About.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/Landing/About.jsx)):
  - Extended all scroll reveals and staggered entries to the Hardware, Sensor, Actuator, and Software columns.

---

## 3. Navigation, Transitions, and Scroll Behaviors
- **Route Transitions**: Injected `<PageTransition />` in [App.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/App.jsx) to add a `page-fade-enter` layout-wide opacity/translate effect.
- **Auto Scroll-to-Top**: Injected `<ScrollToTop />` in `App.jsx` to force view reset on new routing pathnames.
- **Header Navigation Scroll-up**: Hooked `handleNavClick` in [PublicNav.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/components/PublicNav.jsx) to smoothly scroll to the top of the viewport when clicking the home/nav button of the page already in view.

---

## 4. Auth Pages Header Navigation Fix
- **Navigation Panel Restored**: Sign In ([Login.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/Login.jsx)) and Sign Up ([Register.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/Register.jsx)) now display the public navigation bar (`<PublicNav />`) at the top of the viewport.
- **Header Alignment Correction**: Nested the elements inside a flex wrapper (`.auth-wrapper`), letting `.site-nav` sit naturally on top and `.auth-page` fill the remaining height below it, centering cards correctly.
- **De-cluttered Layout**: Removed redundant absolute-positioned `.auth-brand` headers from the login and register views to avoid visual conflicts with the header navigation.
