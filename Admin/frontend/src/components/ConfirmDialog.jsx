import Modal from './Modal';

/** Confirmation dialog for destructive admin actions. */
const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', busy, onConfirm, onClose }) => {
  if (!open) return null;

  return (
    <Modal
      title={title}
      onClose={onClose}
      width={460}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted" style={{ margin: 0 }}>
        {message}
      </p>
    </Modal>
  );
};

export default ConfirmDialog;
