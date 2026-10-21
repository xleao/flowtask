import type { Category, TaskSummary } from "../types/models";
import { Icon, type IconName } from "./Icon";

interface Props {
  categories: Category[];
  summary: TaskSummary | null;
  selected: number | "";
  online: boolean; // estado real de la conexión con la API
  liteEffects: boolean;
  onToggleEffects: () => void;
  onSelect: (categoryId: number | "") => void;
  onRefresh?: () => void;
}

function iconForCategory(name: string): IconName {
  const key = name.toLowerCase();
  if (key === "trabajo") return "terminal";
  if (key === "personal") return "person";
  if (key === "proyectos") return "grid_view";
  if (key === "urgente") return "flag";
  return "layers";
}

export function Sidebar({
  categories,
  summary,
  selected,
  online,
  liteEffects,
  onToggleEffects,
  onSelect,
  onRefresh,
}: Props) {
  const countFor = (id: number) => summary?.by_category[String(id)] ?? 0;
  const all = summary ? Object.values(summary.by_category).reduce((a, b) => a + b, 0) : 0;

  return (
    <aside className="tron-sidebar" aria-label="Categorías del sistema">
      <div className="tron-sidebar__top">
        {/* Tron Identity Disc Logo */}
        <div className="tron-brand">
          <div className="tron-brand__disc logo-disc-anim" aria-hidden="true">
            <div className="tron-brand__disc-inner">
              <span className="tron-brand__disc-core" />
            </div>
            <span className="tron-brand__node tron-brand__node--top" />
            <span className="tron-brand__node tron-brand__node--bottom" />
          </div>
          <div className="tron-brand__text">
            <div className="tron-brand__title-row">
              <span className="tron-brand__name">FLOWTASK</span>
            </div>
            <span className="tron-brand__sub">Actividades del equipo</span>
          </div>
        </div>

        {/* Laser guide line */}
        <div className="laser-line-h laser-line-h--dim" aria-hidden="true" />

        {/* Categories Navigation */}
        <nav className="tron-nav" id="categoryNav" aria-label="Categorías">
          <div className="tron-nav__header">
            <span className="tron-nav__heading">Categorías</span>
            <span className="tron-nav__dot" aria-hidden="true" />
          </div>

          <button
            type="button"
            className={`cat-nav-btn ${selected === "" ? "active" : ""}`}
            aria-current={selected === "" ? "page" : undefined}
            onClick={() => onSelect("")}
          >
            <div className="cat-nav-btn__left">
              <Icon name="inbox" size={17} className="cat-nav-btn__icon" />
              <span>Todas las tareas</span>
            </div>
            <span className="cat-counter">{all}</span>
          </button>

          {categories.map((c) => {
            const isUrgent = c.name.toLowerCase() === "urgente";
            const isActive = selected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`cat-nav-btn ${isUrgent ? "cat-nav-btn--urgent" : ""} ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(isActive ? "" : c.id)}
                title={c.description ?? undefined}
              >
                <div className="cat-nav-btn__left">
                  <Icon name={iconForCategory(c.name)} size={17} className="cat-nav-btn__icon" />
                  <span>{c.name}</span>
                </div>
                <span className="cat-counter">{countFor(c.id)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile / TRON Identity Status */}
      <div className="tron-sidebar__footer">
        <div className="tron-profile">
          <div className="tron-profile__left">
            <div className="tron-avatar">
              FT
              {online && <span className="tron-avatar__ping" aria-hidden="true" />}
            </div>
            <div className="tron-profile__info">
              <span className="tron-profile__name">Espacio de trabajo</span>
              <span className="tron-profile__status" role="status">
                <span
                  className={`tron-profile__led ${online ? "" : "tron-profile__led--off"}`}
                  aria-hidden="true"
                />
                {online ? "Conectado a la API" : "Sin conexión"}
              </span>
            </div>
          </div>
          <div className="tron-profile__actions">
            {/* Interruptor: etiqueta fija + aria-pressed indica si las animaciones están activas. */}
            <button
              type="button"
              className={`tron-settings-btn ${liteEffects ? "" : "tron-settings-btn--on"}`}
              onClick={onToggleEffects}
              aria-pressed={!liteEffects}
              aria-label="Animaciones de fondo"
              title={
                liteEffects
                  ? "Modo ligero activo. Clic para activar animaciones de fondo"
                  : "Animaciones activas. Clic para modo ligero (equipos lentos)"
              }
            >
              <Icon name="bolt" size={18} />
            </button>
            <button
              type="button"
              className="tron-settings-btn"
              onClick={onRefresh}
              title="Actualizar tareas"
              aria-label="Actualizar tareas"
            >
              <Icon name="refresh" size={18} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
