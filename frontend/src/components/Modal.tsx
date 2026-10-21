import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: "cyan" | "derez";
}

/** Envuelve <dialog> nativo con diseño TRON HUD Holo Floating Card. */
export function Modal({ open, title, onClose, children, variant = "cyan" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`tron-modal ${variant === "derez" ? "tron-modal--derez" : ""}`}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {variant === "derez" ? (
        <div className="tron-modal__derez-body">{children}</div>
      ) : (
        <div className="tron-modal__body">
          <header className="tron-modal__header">
            <div className="tron-modal__title-wrap">
              <span className="tron-modal__dot" aria-hidden="true" />
              <h2 id="modal-title">{title}</h2>
            </div>
            <button type="button" className="tron-modal__close" aria-label="Cerrar" onClick={onClose}>
              <Icon name="x" size={20} />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
