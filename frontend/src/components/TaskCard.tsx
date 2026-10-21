import { TASK_STATUSES, type Task, type TaskStatus } from "../types/models";
import { daysUntil, formatDate, relativeDue } from "../utils/dates";
import { Icon } from "./Icon";

interface Props {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function dueBadgeText(iso: string, days: number): string {
  if (days < 0) return `Vencida ${relativeDue(iso).toLowerCase()}`;
  if (days === 0) return "Vence hoy";
  return relativeDue(iso); // "Mañana", "En 3 días" o la fecha
}

export function TaskCard({ task, onToggleComplete, onStatusChange, onEdit, onDelete }: Props) {
  const done = task.status === "Completada";
  const days = daysUntil(task.due_date);
  const isUrgent = task.category.name.toLowerCase() === "urgente";

  if (done) {
    return (
      <article
        className={`task-card task-card--completed group tron-glass ${isUrgent ? "task-card--border-error" : "task-card--border-secondary"}`}
      >
        <div className="task-card__left">
          <button
            type="button"
            className="identity-disc completed"
            onClick={() => onToggleComplete(task)}
            aria-pressed={true}
            aria-label={`Reabrir "${task.title}"`}
            title="Reabrir tarea"
          >
            <div className="identity-disc-inner" />
          </button>

          <div className="task-card__body" onClick={() => onEdit(task)}>
            <div className="task-card__row">
              <span className="task-title task-title--done">{task.title}</span>
              <span className="tron-badge tron-badge--done">Completada</span>
              <span className="tron-completed-date" title={`Fecha límite: ${formatDate(task.due_date)}`}>
                {relativeDue(task.due_date)}
              </span>
              <span className="tron-badge tron-badge--cat-dim">{task.category.name}</span>
            </div>
            {task.description && <p className="task-desc task-desc--done">{task.description}</p>}
          </div>
        </div>

        <div className="task-card__right">
          <button
            type="button"
            className="reopen-btn"
            onClick={() => onToggleComplete(task)}
            title="Reabrir tarea"
          >
            Reabrir
          </button>
          <button
            type="button"
            className="tron-icon-btn tron-icon-btn--edit"
            onClick={() => onEdit(task)}
            aria-label={`Editar "${task.title}"`}
            title="Editar tarea"
          >
            <Icon name="edit" size={16} />
          </button>
          <button
            type="button"
            className="tron-icon-btn tron-icon-btn--delete"
            onClick={() => onDelete(task)}
            aria-label={`Eliminar "${task.title}"`}
            title="Eliminar tarea"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </article>
    );
  }

  const borderClass =
    days < 0 || isUrgent
      ? "task-card--border-error"
      : task.status === "En Progreso" || days === 0
        ? "task-card--border-cyan"
        : "task-card--border-outline";

  const dueBadgeClass =
    days < 0 ? "tron-badge--error" : days === 0 ? "tron-badge--amber" : "tron-badge--cyan";

  return (
    <article className={`task-card group tron-glass bracket-corners ${borderClass}`}>
      <div className="task-card__left">
        <button
          type="button"
          className="identity-disc"
          onClick={() => onToggleComplete(task)}
          aria-pressed={false}
          aria-label={`Completar "${task.title}"`}
          title="Marcar como completada"
        >
          <div className="identity-disc-inner" />
        </button>

        <div className="task-card__body" onClick={() => onEdit(task)}>
          <div className="task-card__row">
            <span className="task-title">{task.title}</span>
            <span className={`tron-badge ${dueBadgeClass}`} title={`Fecha límite: ${formatDate(task.due_date)}`}>
              <time dateTime={task.due_date}>{dueBadgeText(task.due_date, days)}</time>
            </span>
            <span className="tron-badge tron-badge--cat">{task.category.name}</span>
          </div>
          {task.description && <p className="task-desc">{task.description}</p>}
        </div>
      </div>

      <div className="task-card__right">
        <label
          className={`tron-status-pill ${task.status === "En Progreso" ? "tron-status-pill--active" : "tron-status-pill--pending"}`}
        >
          <span className="visually-hidden">Estado de "{task.title}"</span>
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="task-card__hover-actions">
          <button
            type="button"
            className="tron-icon-btn tron-icon-btn--edit"
            onClick={() => onEdit(task)}
            aria-label={`Editar "${task.title}"`}
            title="Editar tarea"
          >
            <Icon name="edit" size={16} />
          </button>
          <button
            type="button"
            className="tron-icon-btn tron-icon-btn--delete"
            onClick={() => onDelete(task)}
            aria-label={`Eliminar "${task.title}"`}
            title="Eliminar tarea"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
