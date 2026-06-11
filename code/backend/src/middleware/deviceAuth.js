/**
 * deviceAuth.js
 * Middleware for authenticating IoT device requests via a shared API key.
 *
 * The ESP32 (or any hardware client) must include the header:
 *   X-Device-Key: <value of DEVICE_API_KEY env var>
 *
 * This prevents arbitrary external callers from spoofing sensor readings
 * on the unauthenticated /api/sensors/log endpoint.
 */

export const verifyDeviceKey = (req, res, next) => {
  const deviceKey = req.header('X-Device-Key');
  const expectedKey = process.env.DEVICE_API_KEY;

  if (!expectedKey) {
    // If the env var is missing, fail open in development but fail closed in production
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ DEVICE_API_KEY is not set — refusing device requests in production.');
      return res.status(503).json({ error: 'Service misconfigured. Contact administrator.' });
    }
    console.warn('⚠️  DEVICE_API_KEY not set — device auth skipped (development mode only).');
    return next();
  }

  if (!deviceKey || deviceKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid or missing device API key.' });
  }

  next();
};
