import { SEARCH_SHORTCUT } from "../utils/platform";
import { Icon } from "./Icon";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  activeCount: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, activeCount, pageSize, onChange }: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <footer className="tron-footer" aria-label="Estado y Paginación">
      <div className="tron-footer__left">
        <span className="tron-footer__led" aria-hidden="true" />
        <span id="pageRangeDisplay">
          {activeCount} {activeCount === 1 ? "tarea abierta" : "tareas abiertas"}
          {totalPages > 1 ? ` · Mostrando ${from}–${to} de ${total}` : ""}
        </span>
      </div>

      {totalPages > 1 && (
        <nav className="tron-pagination" aria-label="Paginación">
          <button
            type="button"
            className="tron-page-btn"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            aria-label="Página anterior"
          >
            <Icon name="chevronLeft" size={14} />
            <span>Ant.</span>
          </button>
          <span className="tron-page-indicator">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="tron-page-btn"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            aria-label="Página siguiente"
          >
            <span>Sig.</span>
            <Icon name="chevronRight" size={14} />
          </button>
        </nav>
      )}

      <div className="tron-footer__right" aria-hidden="true">
        <kbd className="tron-kbd">N</kbd>
        <span>Nueva tarea</span>
        <span className="tron-footer__sep">•</span>
        <kbd className="tron-kbd">{SEARCH_SHORTCUT}</kbd>
        <span>Buscar</span>
      </div>
    </footer>
  );
}
