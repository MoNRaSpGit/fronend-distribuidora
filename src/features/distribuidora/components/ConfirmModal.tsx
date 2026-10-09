interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  // Texto del boton mientras la accion esta en curso ("Eliminando…").
  busyLabel?: string;
  // true = accion destructiva: el boton de confirmar va en rojo.
  danger?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Confirmacion propia de la app (09/10/2026, pedido explicito: "que sea
// un modal nuestro, no uno de Windows") -- reemplaza a window.confirm.
export function ConfirmModal({ title, message, confirmLabel, busyLabel, danger, busy, error, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-backdrop no-print" onClick={busy ? undefined : onCancel}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p className="confirm-message">{message}</p>

        {error && <p className="message message-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy} autoFocus>
            Cancelar
          </button>
          <button
            type="button"
            className={`button ${danger ? "button-danger-solid" : "button-primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
