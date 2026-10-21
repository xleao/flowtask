import { useState } from "react";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "¿Eliminar esta tarea?",
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  onCancel,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={onCancel} variant="derez">
      <div className="derez-alert__icon" aria-hidden="true">
        <Icon name="alert" size={22} />
      </div>
      <h4 className="derez-alert__title" id="modal-title">
        {title}
      </h4>
      <p className="derez-alert__msg" id="confirmDeleteTaskTitle">
        {message}
      </p>
      <div className="derez-alert__actions">
        <button
          type="button"
          className="derez-alert__cancel"
          id="cancelDeleteBtn"
          onClick={onCancel}
          disabled={busy}
          autoFocus
        >
          Cancelar
        </button>
        <button
          type="button"
          className="derez-alert__confirm"
          id="executeDeleteBtn"
          onClick={confirm}
          disabled={busy}
        >
          {busy ? "Eliminando..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
