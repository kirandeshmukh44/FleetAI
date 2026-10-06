import { toneFor } from '../utils/format';

/** Coloured pill for status / risk / role values. */
const Badge = ({ value, tone, children }) => {
  const label = children ?? (value ? String(value).replace(/_/g, ' ') : '—');
  const modifier = tone ?? toneFor(value);
  return <span className={`badge badge-${modifier}`}>{label}</span>;
};

export default Badge;
