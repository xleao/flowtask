import type { Category } from "../types/models";
import { Icon } from "./Icon";
import { SearchBox } from "./SearchBox";

interface Props {
  category: Category | undefined; // undefined = "Todas las tareas"
  total: number;
  searchKey: number; // cambiarla vacía el buscador (lo remonta)
  onSearch: (q: string) => void;
  onNewTask: () => void;
}

/** Barra superior fija: qué se está viendo, buscador y acción principal. */
export function Topbar({ category, total, searchKey, onSearch, onNewTask }: Props) {
  return (
    <header className="tron-topbar">
      <div className="tron-topbar__left">
        <div className="tron-topbar__titles">
          <div className="tron-topbar__title-row">
            <h1 className="tron-topbar__title" id="currentSectionTitle">
              {category?.name ?? "Todas las tareas"}
            </h1>
            <span className="tron-topbar__count" id="currentSectionCount">
              ({total})
            </span>
          </div>
          <span className="tron-topbar__sub">
            {category?.description ?? "Seguimiento de actividades por área y proyecto"}
          </span>
        </div>
      </div>

      <SearchBox key={searchKey} onSearch={onSearch} />

      <div className="tron-topbar__right">
        <button type="button" className="tron-new-btn" id="openNewTaskModalBtn" onClick={onNewTask}>
          <Icon name="plus" size={16} />
          <span className="tron-new-btn__label">Nueva tarea</span>
          <kbd className="tron-new-btn__kbd" aria-hidden="true">
            N
          </kbd>
        </button>
      </div>
    </header>
  );
}
