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

---

## 5. Offline Threshold Sync Mechanism
Implemented a hybrid sync mechanism to ensure the ESP32 receives updated threshold levels, even if the device was offline/disconnected when the thresholds were modified in the dashboard:
- **Retained Configuration Messages**: Backend now publishes threshold updates via `publishThresholdConfig` in [mqttService.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/services/mqttService.js) using `{ qos: 1, retain: true }`. The MQTT broker caches the configuration and automatically pushes it to the ESP32 the moment it reconnects.
- **On-Demand Sync Request (Method B)**: Backend listens to the `device/+/request_thresholds` topic. When the ESP32 connects and publishes to this topic, the backend retrieves the current values from MongoDB and sends them down to the device.
- **Refactored Threshold Service**: Updated [thresholdService.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/services/thresholdService.js) to leverage retained configuration publishing instead of general actuator commands.

---

## 6. Mock Devices & Alert Triggering Sandbox
We introduced a testing and simulation sandbox in the [code/backend/scratch/](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/scratch/) folder to model telemetry, test alerts, and verify notification services:
- **Telemetry Simulation** ([mock_devices.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/scratch/mock_devices.js)): 
  - Simulates 4 virtual tanks (`GUARD-TEST-001` through `GUARD-TEST-004`) with default safe ranges.
  - Automatically loads backend env and publishes telemetry updates every 30 seconds to the MQTT broker and InfluxDB database.
  - Features an interactive keyboard terminal: press `a` to instantly trigger a random out-of-range sensor alert (holding it active for 2 minutes/4 cycles before returning to safe zones), press `r` to clear all active alerts immediately, or press `q` to quit.
- **One-off Alert Testing** ([trigger_alert.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/scratch/trigger_alert.js)): 
  - A standalone utility to publish a one-off critical sensor alert and out-of-bounds telemetry value to HiveMQ, letting you verify Telegram bot and email triggers on demand.
- **Verification Utilities**:
  - [verify_telegram.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/scratch/verify_telegram.js): Tests Telegram bot token authentication and sends direct test alert notifications to verified admins.
  - [verify_admin.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/verify_admin.js): Queries the DB to verify admin profile configurations (`telegramChatId`, `phoneVerified`).
  - [test.cjs](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/scratch/test.cjs): Basic MQTT subscriber client.

---

## 7. Telegram Alert & Verification Migration
We fully migrated the phone verification and out-of-bounds threshold warning system from WhatsApp to a dedicated Telegram Bot.
- **Telegram Bot Service Integration** ([telegramService.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/services/telegramService.js)):
  - Connected the backend to the Telegram API (`8856499141:AAFEYLa-mP8F7pBPBoQEj97Jlxzk3Y4fk6I`) to power `@GUARD_yp_bot`.
  - Implemented the background `pollTelegramUpdates` polling service which starts up on server boot in [index.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/index.js).
  - Implemented secure contact-sharing verification:
    1. Users initiate verification on the frontend profile page, which generates a temporary 6-digit OTP code (`phoneOtpCode`).
    2. Users message the OTP code to `@GUARD_yp_bot`.
    3. The bot prompts the user with a keyboard button to securely share their Telegram contact number (`request_contact: true`).
    4. Upon contact share, the bot normalizes the shared phone number (stripping non-digit characters) and matches it against the database `pendingPhone` field. 
    5. On a successful match, the bot sets `phoneVerified = true`, updates the user's active `telegramChatId`, and registers the phone number.
- **Critical Alert Integration**:
  - Re-routed alert dispatching logic inside `_processAlertImpl` in [mqttService.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/services/mqttService.js) to send critical water tank status notifications directly to the user's verified Telegram chat via the bot.
  - Cleaned up the codebase by completely removing the deprecated `whatsappService.js`.

---

## 8. Glassmorphic User Profile Page & Picture Uploads
The user profile interface was redesigned to deliver a premium visual experience:
- **Glassmorphic Layout & Styling** ([Profile.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/Profile.jsx), [profile.css](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/styles/profile.css)):
  - Upgraded the profile page with a modern, glassmorphic layout featuring translucent containers, blurred background gradients, and sleek button controls.
  - Implemented a locked username card preventing modifications, securing system identities.
- **Profile Picture Uploads**:
  - Implemented file upload capability. Configured `multer` storage middleware in [userController.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/controllers/auth/userController.js) to store profile images securely under `/public/uploads/profile/` with a file size limit of 3MB.
  - Handles replacing/deleting deprecated profile images from the filesystem when users upload a new photo or delete their current profile image.
- **Verification UI & Country Code Selector**:
  - Added a responsive country code dropdown selector (defaulting to Sri Lanka `+94`) immediately next to the local phone input field.
  - Configured step-by-step UI instructions with direct links to `@GUARD_yp_bot`. It prompts users to input the OTP on Telegram, click "Share Contact", and then verify their status with a confirmation check. The page halts details saving if changes are unverified.

---

## 9. Strict Account Uniqueness Constraints
We enforced strict registration and update rules ensuring system security and database consistency:
- **Email & Phone Uniqueness**:
  - Implemented cross-account validation in [createUserHelper.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/controllers/auth/createUserHelper.js) (registration) and [userController.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/controllers/auth/userController.js) (profile editing).
  - Users are blocked from registering or modifying their profile to use an email address or phone number that is already associated with another active account, returning a `409 Conflict` error to prevent duplicates.

---

## 10. Product Ordering, Visual Polish, & Super Admin Device Inventory
We optimized the ordering flow, improved the landing page visual consistency, and upgraded the device registration process:
- **Collapsible Order Form & Device Clamping**:
  - Replaced the static order form on the landing page with a "Get Started with GUARD" CTA button. Clicking it expands a form card directly underneath with smooth transitions.
  - Implemented click-outside detection in [Landing.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/Landing/Landing.jsx) to automatically close the form if a click occurs outside the card container.
  - Restricted the maximum number of ordered devices to 20 per request, enforcing this via client-side input constraints (`max="20"`) and backend verification in [deviceRequestController.js](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/controllers/deviceRequestController.js).
- **Navigation Polish**:
  - Resized the header logo in [navigation.css](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/styles/navigation.css) to `56px` for better visibility, and adjusted top bar vertical padding to `0.4rem` to keep the layout compact.
  - Replaced the default browser globe favicon in [index.html](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/index.html) with the custom G.U.A.R.D logo.
- **Super Admin Auto-Key Generator**:
  - Refactored [AddDeviceForm.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/components/admin/AddDeviceForm.jsx) to prevent manually typing the product key, making the input `readOnly`.
  - Added a "Generate" button that automatically creates a secure 16-character alphanumeric key.
  - Aligned all form fields (Tank ID, Product Key generator, and submit button) horizontally on the same line.

---

## 11. Profile Page Merge Conflict Fixes & Inline Alert Preference Toggles
- **Profile Page Conflict Resolution** ([Profile.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/Profile.jsx)):
  - Removed duplicate declarations of `handlePhotoUpload` and `handlePhotoDelete` handlers.
  - Cleaned up a duplicate and incorrect `handleConfirmEmailOtp` handler to restore clean syntax compiling.
- **Toggleable Email/Telegram Alert Settings** ([Alerts.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/Alerts.jsx)):
  - Extended the database schema to support boolean settings `emailAlertsEnabled` and `telegramAlertsEnabled` (defaulting to `true`).
  - Added toggle controls in the filters card layout at the top of the Notifications page, aligned cleanly to the right-hand side using inline form groups.
  - Embedded micro-feedback popups inside the toggle headers to report save success/error status asynchronously.
  - Hooked toggles to user update APIs to persist preferences in MongoDB, and updated the MQTT alert worker to respect them when sending warning triggers.
- **About Page Illustration Update** ([About.jsx](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/Landing/About.jsx)):
  - Replaced the placeholder software image wrapper with a real, high-resolution platform dashboard screenshot illustration (`dashboardMockup`).

