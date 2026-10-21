import { useState, type FormEvent } from "react";
import { ApiError } from "../services/apiClient";
import { TASK_STATUSES, type Category, type Task, type TaskCreate, type TaskStatus } from "../types/models";
import { addDaysISO, todayISO } from "../utils/dates";
import { Icon } from "./Icon";

interface Props {
  categories: Category[];
  task?: Task; // presente = modo edición
  defaultCategoryId?: number;
  onSubmit: (payload: TaskCreate) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string;
  category_id: string;
}

type Errors = Partial<Record<keyof FormState | "general", string>>;

const QUICK_DATES = [
  { label: "Hoy", value: () => todayISO() },
  { label: "Mañana", value: () => addDaysISO(1) },
  { label: "En una semana", value: () => addDaysISO(7) },
];

// Mismas reglas que el backend (app/schemas/task.py): feedback inmediato sin ida y vuelta.
function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.title.trim()) e.title = "Por favor, escribe un título para la tarea.";
  else if (f.title.trim().length > 120) e.title = "El título no puede superar los 120 caracteres.";
  if (f.description.length > 1000) e.description = "La descripción no puede superar los 1000 caracteres.";
  if (!f.due_date) e.due_date = "Elige una fecha límite.";
  if (!f.category_id) e.category_id = "Elige una categoría.";
  return e;
}

export function TaskForm({ categories, task, defaultCategoryId, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<FormState>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "Pendiente",
    due_date: task?.due_date ?? todayISO(),
    category_id: String(task?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? ""),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, general: undefined }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        due_date: form.due_date,
        category_id: Number(form.category_id),
      });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrors({ ...apiErr?.fieldErrors, general: apiErr?.message ?? "No se pudo guardar la tarea." });
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (key: keyof FormState) =>
    errors[key] && (
      <span className="tron-field-error" id={`${key}-error`} role="alert">
        {errors[key]}
      </span>
    );

  return (
    <form className="tron-form" id="taskModalForm" onSubmit={handleSubmit} noValidate>
      {errors.general && (
        <div className="tron-alert-banner" role="alert">
          <Icon name="alert" size={16} />
          <span>{errors.general}</span>
        </div>
      )}

      {/* Title Input */}
      <div className="tron-field">
        <label className="tron-label" htmlFor="modalTaskTitle">
          Título de la tarea
        </label>
        <input
          id="modalTaskTitle"
          className="tron-input"
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={120}
          placeholder="¿Qué hay que hacer? Ej. Enviar entrega final..."
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
          autoFocus
        />
        {fieldError("title")}
      </div>

      {/* Optional Notes / Context */}
      <div className="tron-field">
        <label className="tron-label" htmlFor="modalTaskDesc">
          Descripción o notas <span className="tron-label__opt">(opcional)</span>
        </label>
        <textarea
          id="modalTaskDesc"
          className="tron-input tron-textarea"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Detalles, enlaces o contexto adicional..."
        />
        {fieldError("description")}
      </div>

      {/* Category & Due Date Row */}
      <div className="tron-grid-2">
        <div className="tron-field">
          <label className="tron-label" htmlFor="modalCategory">
            Categoría
          </label>
          <select
            id="modalCategory"
            className="tron-select"
            value={form.category_id}
            onChange={(e) => set("category_id", e.target.value)}
            aria-invalid={!!errors.category_id}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldError("category_id")}
        </div>

        <div className="tron-field">
          <label className="tron-label" htmlFor="modalDueDate">
            Fecha límite
          </label>
          <input
            id="modalDueDate"
            className="tron-input tron-input--date"
            type="date"
            value={form.due_date}
            min={task ? undefined : todayISO()}
            onChange={(e) => set("due_date", e.target.value)}
            aria-invalid={!!errors.due_date}
          />
          {fieldError("due_date")}
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="tron-presets">
        {QUICK_DATES.map((q) => {
          const val = q.value();
          return (
            <button
              key={q.label}
              type="button"
              className={`tron-preset-btn ${form.due_date === val ? "active" : ""}`}
              onClick={() => set("due_date", val)}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      {/* Initial Status */}
      <div className="tron-field">
        <span className="tron-label">Estado</span>
        <div className="tron-status-grid" role="radiogroup" aria-label="Estado de la tarea">
          {TASK_STATUSES.map((s) => (
            <label key={s} className="tron-status-radio">
              <input
                type="radio"
                name="modalStatus"
                value={s}
                checked={form.status === s}
                onChange={() => set("status", s)}
              />
              <div className="tron-status-radio__box">{s}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="tron-form__actions">
        <button
          type="button"
          className="tron-cancel-btn"
          id="cancelTaskModalBtn"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="tron-submit-btn" disabled={saving}>
          {saving ? "Guardando..." : task ? "Guardar cambios" : "Crear tarea"}
        </button>
      </div>
    </form>
  );
}
