import { useCallback, useState } from "react";
import { Icon } from "./Icon";

export interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

export type Notify = (kind: Toast["kind"], message: string) => void;

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback(
    (kind: Toast["kind"], message: string) => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-2), { id, kind, message }]); // máximo 3 en pantalla
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3000);
    },
    [dismiss],
  );

  return { toasts, notify, dismiss };
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="tron-toasts" id="toastContainer" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`tron-toast ${t.kind === "error" ? "tron-toast--error" : ""}`}>
          <span className="tron-toast__led" aria-hidden="true" />
          <span className="tron-toast__msg">{t.message}</span>
          <button
            type="button"
            className="tron-toast__close"
            aria-label="Cerrar aviso"
            onClick={() => onDismiss(t.id)}
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
