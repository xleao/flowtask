import { TASK_STATUSES, type TaskStatus, type TaskSummary } from "../types/models";

interface Props {
  status: TaskStatus | "";
  summary: TaskSummary | null;
  showCompleted: boolean;
  onToggleCompleted: () => void;
  onChange: (status: TaskStatus | "") => void;
}

/** Franja superior: conteos del tablero + dropdown de filtro por estado (Caso 3). */
export function FilterBar({ status, summary, showCompleted, onToggleCompleted, onChange }: Props) {
  const todayAndOverdue = summary ? summary.due_today + summary.overdue : 0;
  const inQueue = summary ? summary.by_status.Pendiente + summary.by_status["En Progreso"] : 0;
  const completedCount = summary ? summary.by_status.Completada : 0;

  return (
    <section className="hud-strip" aria-label="Telemetría y filtro de estado">
      {/* Status Telemetry Nodes */}
      <div className="hud-strip__kpis">
        {/* KPI 1: Hoy (Amber Tron Flare) */}
        <div className="hud-kpi hud-kpi--amber" title="Tareas para hoy o vencidas">
          <span className="hud-kpi__dot hud-kpi__dot--amber" aria-hidden="true" />
          <span className="hud-kpi__label">Para hoy:</span>
          <span className="hud-kpi__value">{todayAndOverdue}</span>
        </div>

        {/* KPI 2: En Cola (Cyan Core) */}
        <div className="hud-kpi hud-kpi--cyan" title="Tareas en estado Pendiente o En Progreso">
          <span className="hud-kpi__dot hud-kpi__dot--cyan" aria-hidden="true" />
          <span className="hud-kpi__label">Abiertas:</span>
          <span className="hud-kpi__value">{inQueue}</span>
        </div>

        {/* KPI 3: Completadas (Minimizadas / Toggle) */}
        <button
          type="button"
          className="hud-kpi hud-kpi--secondary hud-kpi--btn"
          onClick={onToggleCompleted}
          aria-expanded={showCompleted}
          title="Mostrar u ocultar tareas completadas"
        >
          <span className="hud-kpi__dot hud-kpi__dot--secondary" aria-hidden="true" />
          <span className="hud-kpi__label">Completadas:</span>
          <span className="hud-kpi__value">{completedCount}</span>
          <span className="hud-kpi__chevron">{showCompleted ? "Ocultar" : "Ver"}</span>
        </button>
      </div>

      {/* Dropdown nativo: accesible por teclado y lector de pantalla, y cómodo en móvil.
          Las opciones son exactamente las del enunciado: Todos / Pendiente / En Progreso / Completada. */}
      <label className={`hud-filter ${status ? "hud-filter--active" : ""}`}>
        <span className="hud-filter__label">Estado</span>
        <select
          id="statusFilter"
          className="hud-filter__select"
          value={status}
          onChange={(e) => onChange(e.target.value as TaskStatus | "")}
        >
          <option value="">Todos</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
