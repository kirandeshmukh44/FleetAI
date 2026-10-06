/** Formatting helpers shared across admin pages. */

export const formatNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : fallback;
};

export const formatDecimal = (value, digits = 1, fallback = '—') => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : fallback;
};

export const formatCurrency = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `₹${number.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const formatDate = (value, withTime = true) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

export const formatRelative = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value, false);
};

/** Map a status/risk value onto its badge modifier class. */
export const toneFor = (value) => String(value || '').toLowerCase().replace(/\s+/g, '_');
