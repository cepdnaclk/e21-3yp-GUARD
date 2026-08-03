/**
 * Dynamic, role-aware tour step definitions.
 *
 * Admin tour = [...COMMON_STEPS, ...ADMIN_EXTENSION_STEPS]
 *
 * Every step has:
 *   route   — the /demo/* sub-route to navigate to before highlighting
 *   element — CSS selector driver.js will focus on
 *   popover — title, description, side, align
 */

// ── Steps shared by all roles ─────────────────────────────────────────────

export const COMMON_STEPS = [
  // ① Tank Roster  (targets the tank-card grid)
  {
    route:   '/demo/dashboard',
    element: '#tank-grid',
    popover: {
      title:       'Tank Roster',
      description: 'Your tanks are displayed as cards here. Each card shows live sensor readings (pH, Temp, TDS, Turbidity, Water Level), an online/offline status dot, and active alert badges. Click any card to drill into a specific tank.',
      side:  'bottom',
      align: 'start',
    },
  },

  // ② Real-time stats bar  (targets the bottom summary row)
  {
    route:   '/demo/dashboard',
    element: '#dash-stats',
    popover: {
      title:       'Real-Time Telemetry',
      description: 'These summary stats refresh every 30 seconds and via live WebSocket. "Active Alerts" turns red whenever any sensor reading breaches a configured threshold.',
      side:  'top',
      align: 'start',
    },
  },

  // ③ Notifications / Alerts  (targets the alert notifications table card)
  {
    route:   '/demo/alerts',
    element: '#alerts-table-card',
    popover: {
      title:       'Notifications & Alerts',
      description: 'All threshold breaches appear here as a table. Filter by device or status (Active / Resolved / All). Toggle Email and Telegram alert delivery preferences directly from this page.',
      side:  'top',
      align: 'center',
    },
  },

  // ④ Historical Analytics  (targets the analytics chart card)
  {
    route:   '/demo/analytics',
    element: '#analytics-card',
    popover: {
      title:       'Historical Analytics',
      description: 'View time-series charts for pH, Temperature, TDS, Turbidity, and Water Level. Pick a custom date range and overlay any combination of sensor types on the same chart.',
      side:  'top',
      align: 'center',
    },
  },

  // ⑤ Fish Species Library  (targets the fish species grid)
  {
    route:   '/demo/fish',
    element: '#fish-grid',
    popover: {
      title:       'Fish Species Library',
      description: 'Browse species cards and click any fish to see its ideal water parameter ranges. The system cross-references these against your tank thresholds and automatically flags incompatibilities.',
      side:  'top',
      align: 'center',
    },
  },

  // ⑥ Profile & Account Settings  (targets the profile details section card)
  {
    route:   '/demo/profile',
    element: '#profile-card',
    popover: {
      title:       'Profile & Account Settings',
      description: 'Update your name, email, phone number, address, and notification preferences (Email & Telegram alerts) all from this page.',
      side:  'bottom',
      align: 'center',
    },
  },

  // ⑦ Dark / Light Mode toggle  (targets the theme-toggle button in the topnav)
  {
    route:   '/demo/profile',
    element: '#tour-theme-toggle',
    popover: {
      title:       'Dark / Light Mode',
      description: 'Click this toggle in the navigation bar to switch between Light and Dark mode at any time. Your preference is saved automatically.',
      side:  'bottom',
      align: 'end',
    },
  },
];

// ── Admin-only extension (appended after commonSteps) ─────────────────────

export const ADMIN_EXTENSION_STEPS = [
  // ⑧ Adding new tanks
  {
    route:   '/demo/devices',
    element: '#add-device-btn',
    popover: {
      title:       'Adding New Tanks',
      description: 'As an Admin you can register new hardware sensors using the 16-character Product Key shipped with each G.U.A.R.D device. Give it a friendly name and it will appear in every worker\'s roster.',
      side:  'bottom',
      align: 'start',
    },
  },

  // ⑨ Creating worker accounts
  {
    route:   '/demo/users',
    element: '#add-user-btn',
    popover: {
      title:       'Creating Worker Accounts',
      description: 'Use the "Add User" form to create Worker (USER role) accounts for your team. Each worker sees only the tanks that have been assigned to them.',
      side:  'bottom',
      align: 'start',
    },
  },

  // ⑩ Assigning tanks to workers
  {
    route:   '/demo/users',
    element: '#user-table',
    popover: {
      title:       'Assigning Tanks to Workers',
      description: 'Click the "Assign Tanks" button next to any worker in this table to map one or more tanks. The assigned tanks will immediately appear in that worker\'s dashboard.',
      side:  'top',
      align: 'start',
    },
  },

  // ⑪ Configuring alert thresholds
  {
    route:   '/demo/devices',
    element: '#devices-table',
    popover: {
      title:       'Configuring Alert Thresholds',
      description: 'Click "Details" on any device row to open its configuration panel. From there, set the min/max thresholds for pH, Temperature, TDS, Turbidity, and Water Level that trigger automated alerts.',
      side:  'top',
      align: 'start',
    },
  },
];

/**
 * Returns the complete step array for the given role.
 *   ADMIN → [...COMMON_STEPS, ...ADMIN_EXTENSION_STEPS]  (11 steps)
 *   USER  → COMMON_STEPS only                            (7 steps)
 */
export function buildTourSteps(role) {
  if (role === 'ADMIN') {
    return [...COMMON_STEPS, ...ADMIN_EXTENSION_STEPS];
  }
  return COMMON_STEPS;
}
