/** Inline success / error / info banner. */
const Alert = ({ tone = 'info', children, onDismiss }) => {
  if (!children) return null;
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span style={{ flex: 1 }}>{children}</span>
      {onDismiss ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </div>
  );
};

export default Alert;
