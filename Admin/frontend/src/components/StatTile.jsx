/** Headline KPI tile used across the admin overview and detail pages. */
const StatTile = ({ label, value, icon: Icon, tone = 'var(--accent)', hint }) => (
  <div className="stat-tile">
    <div className="stat-tile-head">
      <span className="stat-tile-label">{label}</span>
      {Icon ? (
        <span className="stat-tile-icon" style={{ background: `color-mix(in srgb, ${tone} 18%, transparent)`, color: tone }}>
          <Icon size={18} />
        </span>
      ) : null}
    </div>
    <div className="stat-tile-value">{value}</div>
    {hint ? <div className="stat-tile-foot">{hint}</div> : null}
  </div>
);

export default StatTile;
