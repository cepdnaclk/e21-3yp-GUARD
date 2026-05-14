/**
 * Shared formatting utilities.
 */

/**
 * Formats a date string into a human-readable relative time string.
 * e.g. "just now", "5m ago", "2h ago", "3d ago"
 */
export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

/**
 * Formats an ISO date string for chart axis / tooltip display.
 */
export function formatChartTime(value) {
  if (!value) return '';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return String(value);
  return time.toLocaleString();
}

/**
 * Auto-formats a raw alphanumeric string as XXXX-XXXX-XXXX-XXXX.
 * Used by device registration and inventory forms.
 */
export function formatProductKey(raw) {
  const digits = raw.replace(/-/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
  return digits.replace(/(.{4})(?=.)/g, '$1-');
}
