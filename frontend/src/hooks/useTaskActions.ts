import type { Notify } from "../components/Toasts";
import type { Category, Task, TaskCreate, TaskStatus, TaskUpdate } from "../types/models";
import { todayISO } from "../utils/dates";
import { taskDiff } from "../utils/taskDiff";

interface Mutations {
  create: (payload: TaskCreate) => Promise<void>;
  update: (id: number, changes: TaskUpdate) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

const STATUS_MESSAGES: Record<TaskStatus, string> = {
  Completada: "Tarea marcada como completada.",
  "En Progreso": "Tarea movida a En Progreso.",
  Pendiente: "Tarea reabierta como pendiente.",
};

/**
 * Acciones del usuario sobre las tareas: llaman a las mutaciones de `useTasks` y
 * avisan el resultado. Mismo verbo en el botón y en el aviso ("Eliminar" → "eliminada").
 */
export function useTaskActions({ create, update, remove }: Mutations, notify: Notify) {
  /** Formulario: crea, o en edición envía solo lo que cambió. Los errores los muestra el formulario. */
  async function save(payload: TaskCreate, editing?: Task) {
    if (editing) {
      const changes = taskDiff(editing, payload);
      if (Object.keys(changes).length) await update(editing.id, changes);
      notify("success", "Tarea actualizada correctamente.");
    } else {
      await create(payload);
      notify("success", "Tarea creada con éxito.");
    }
  }

  /** Captura rápida: va a la categoría visible, con fecha de hoy (RN-11). */
  async function quickCreate(title: string, category: Category) {
    try {
      await create({ title, description: null, status: "Pendiente", due_date: todayISO(), category_id: category.id });
      notify("success", `Tarea creada en "${category.name}" con fecha límite hoy.`);
    } catch (err) {
      notify("error", (err as Error).message);
      throw err; // QuickCapture conserva el texto para reintentar
    }
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    try {
      await update(task.id, { status });
      notify("success", STATUS_MESSAGES[status]);
    } catch (err) {
      notify("error", (err as Error).message);
    }
  }

  /** Disco de la tarjeta: completa con un clic, o reabre si ya estaba completada. */
  function toggleComplete(task: Task) {
    return changeStatus(task, task.status === "Completada" ? "Pendiente" : "Completada");
  }

  async function deleteTask(task: Task) {
    try {
      await remove(task.id);
      notify("success", "Tarea eliminada.");
    } catch (err) {
      notify("error", (err as Error).message);
    }
  }

  return { save, quickCreate, changeStatus, toggleComplete, deleteTask };
}
