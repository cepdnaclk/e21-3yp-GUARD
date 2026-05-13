/**
 * Wraps an async Express route handler so that rejected promises
 * are automatically forwarded to the next error-handling middleware.
 *
 * Usage:
 *   router.get('/foo', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
