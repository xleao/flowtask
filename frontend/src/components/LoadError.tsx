import { Icon } from "./Icon";

interface Props {
  message: string;
  onRetry: () => void;
}

/** Bloque que reemplaza la lista cuando el backend no responde: qué pasó y cómo reintentar. */
export function LoadError({ message, onRetry }: Props) {
  return (
    <div className="tron-error-block" role="alert">
      <div className="derez-alert__icon" aria-hidden="true">
        <Icon name="alert" size={22} />
      </div>
      <div className="tron-error-block__text">
        <strong>No se pudieron cargar las tareas</strong>
        <p>{message}</p>
      </div>
      <button type="button" className="tron-error-block__btn" onClick={onRetry}>
        <Icon name="refresh" size={15} />
        <span>Reintentar</span>
      </button>
    </div>
  );
}
