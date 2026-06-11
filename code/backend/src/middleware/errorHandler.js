import { AppError } from '../lib/AppError.js';

/**
 * Central Express error-handling middleware.
 * Registered AFTER all routes in index.js.
 *
 * Handles:
 *  - AppError instances (operational, expected)
 *  - Prisma known errors (P2002 duplicate, P2025 not found)
 *  - Everything else as a generic 500
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  // ── AppError (thrown intentionally by our code) ───────────────────
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // ── Prisma: unique constraint violation ───────────────────────────
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({ error: `A record with that ${field} already exists.` });
  }

  // ── Prisma: record not found ──────────────────────────────────────
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }

  // ── Prisma: raw query / network failure (e.g. Atlas IP not whitelisted) ──
  if (err.code === 'P2010' || err.code === 'P1001' || err.code === 'P1002') {
    console.error('❌ Database connectivity error:', err.meta?.message || err.message);
    return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
  }

  // ── Unexpected / programmer error ─────────────────────────────────
  console.error('❌ Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error.' });
};
