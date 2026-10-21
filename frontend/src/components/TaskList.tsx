import type { Task, TaskStatus } from "../types/models";
import { daysUntil } from "../utils/dates";
import { Icon } from "./Icon";
import { TaskCard } from "./TaskCard";

interface Props {
  tasks: Task[];
  loading: boolean;
  hasFilters: boolean;
  statusFilter: TaskStatus | "";
  showCompleted: boolean;
  onToggleCompleted: () => void;
  onToggleComplete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onCreate: () => void;
  onClearFilters: () => void;
}

export function TaskList({
  tasks,
  loading,
  hasFilters,
  statusFilter,
  showCompleted,
  onToggleCompleted,
  onCreate,
  onClearFilters,
  ...rowActions
}: Props) {
  if (loading && tasks.length === 0) {
    return (
      <div className="tron-skeleton-wrap" aria-busy="true" aria-label="Cargando tareas">
        {([1, 2, 3, 4] as const).map((i) => (
          <div key={i} className="tron-glass bracket-corners tron-skeleton-card">
            <span className="tron-skeleton tron-skeleton--disc" />
            <div className="tron-skeleton-card__lines">
              <span className={`tron-skeleton tron-skeleton--line tron-skeleton--w${i}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const sectorToday = tasks.filter((t) => t.status !== "Completada" && daysUntil(t.due_date) <= 0);
  const sectorUpcoming = tasks.filter((t) => t.status !== "Completada" && daysUntil(t.due_date) > 0);
  const sectorCompleted = tasks.filter((t) => t.status === "Completada");

  // Si el usuario filtró explícitamente por "Completada", siempre mostramos el Sector 03
  const completedVisible = showCompleted || statusFilter === "Completada";
  const hasVisibleCards =
    sectorToday.length > 0 || sectorUpcoming.length > 0 || (completedVisible && sectorCompleted.length > 0);

  if (tasks.length === 0 || !hasVisibleCards) {
    return (
      <div className="tron-empty tron-glass" id="emptyFilterState">
        <div className="tron-empty__icon">
          <Icon name="grid_4x4" size={28} />
        </div>
        <span className="tron-empty__title">
          {!hasVisibleCards && sectorCompleted.length > 0
            ? "Todo al día"
            : hasFilters
              ? "Sin resultados"
              : "Aún no hay tareas"}
        </span>
        <span className="tron-empty__sub">
          {!hasVisibleCards && sectorCompleted.length > 0
            ? `No quedan tareas abiertas aquí. ${sectorCompleted.length === 1 ? "Hay 1 completada" : `Hay ${sectorCompleted.length} completadas`}.`
            : hasFilters
              ? "Ninguna tarea coincide con la búsqueda o los filtros elegidos."
              : "Escribe una tarea en la barra de arriba o usa \"Nueva tarea\" para asignarle categoría y fecha."}
        </span>
        {!hasVisibleCards && sectorCompleted.length > 0 ? (
          <button type="button" className="tron-empty__btn" onClick={onToggleCompleted}>
            Ver completadas ({sectorCompleted.length})
          </button>
        ) : hasFilters ? (
          <button type="button" className="tron-empty__btn" id="resetFiltersBtn" onClick={onClearFilters}>
            Ver todas las tareas
          </button>
        ) : (
          <button type="button" className="tron-empty__btn" onClick={onCreate}>
            + Crear primera tarea
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`tron-sectors ${loading ? "tron-sectors--refreshing" : ""}`} id="tasksContainer" aria-busy={loading}>
      {/* SECTOR 01: PARA HOY */}
      {sectorToday.length > 0 && (
        <section className="task-section" id="section-today" aria-label="Tareas para hoy">
          <div className="task-section__header">
            <div className="task-section__title-group">
              <span className="task-section__dot task-section__dot--amber" aria-hidden="true" />
              <span className="task-section__title task-section__title--amber">Para hoy y vencidas</span>
              <span className="section-counter section-counter--amber">{sectorToday.length}</span>
            </div>
            <div className="laser-line-h task-section__line" aria-hidden="true" />
          </div>

          <div className="group-cards">
            {sectorToday.map((task) => (
              <TaskCard key={task.id} task={task} {...rowActions} />
            ))}
          </div>
        </section>
      )}

      {/* SECTOR 02: PRÓXIMOS DÍAS */}
      {sectorUpcoming.length > 0 && (
        <section className="task-section" id="section-upcoming" aria-label="Próximas tareas">
          <div className="task-section__header">
            <div className="task-section__title-group">
              <span className="task-section__dot task-section__dot--outline" aria-hidden="true" />
              <span className="task-section__title task-section__title--outline">Próximos días</span>
              <span className="section-counter section-counter--outline">{sectorUpcoming.length}</span>
            </div>
            <div className="laser-line-h task-section__line task-section__line--dim" aria-hidden="true" />
          </div>

          <div className="group-cards">
            {sectorUpcoming.map((task) => (
              <TaskCard key={task.id} task={task} {...rowActions} />
            ))}
          </div>
        </section>
      )}

      {/* SECTOR 03: COMPLETADAS */}
      {completedVisible && sectorCompleted.length > 0 && (
        <section className="task-section task-section--completed" id="section-completed" aria-label="Tareas completadas">
          <div className="task-section__header">
            <div className="task-section__title-group">
              <span className="task-section__dot task-section__dot--secondary" aria-hidden="true" />
              <span className="task-section__title task-section__title--secondary">
                Completadas
              </span>
              <span className="section-counter section-counter--secondary">{sectorCompleted.length}</span>
            </div>
            <div className="task-section__line-wrap">
              <div className="laser-line-h task-section__line task-section__line--dim" aria-hidden="true" />
              {statusFilter !== "Completada" && (
                <button
                  type="button"
                  className="tron-minimize-btn"
                  id="toggleCompletedCollapseBtn"
                  onClick={onToggleCompleted}
                >
                  Ocultar
                </button>
              )}
            </div>
          </div>

          <div className="group-cards group-cards--completed" id="completedCardsList">
            {sectorCompleted.map((task) => (
              <TaskCard key={task.id} task={task} {...rowActions} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
