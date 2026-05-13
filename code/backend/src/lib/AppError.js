/**
 * Custom operational error class.
 * Throw these from controllers/services — the central error handler
 * converts them into the appropriate HTTP response.
 */
export class AppError extends Error {
  /**
   * @param {string} message  – Human-readable error message (sent to client)
   * @param {number} statusCode – HTTP status code (default 500)
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;          // distinguishes from programmer bugs
    Error.captureStackTrace(this, this.constructor);
  }
}
