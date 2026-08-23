interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, message, confirmLabel = "Confirmar", onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-sm">
        <h2 className="modal-title">{title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <div className="modal-actions">
          <button onClick={onCancel} className="btn-ghost">
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn-danger">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
