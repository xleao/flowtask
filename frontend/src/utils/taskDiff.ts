import type { Task, TaskCreate, TaskUpdate } from "../types/models";

/** Solo los campos que cambiaron: el PATCH es parcial y no re-valida lo que no se tocó. */
export function taskDiff(task: Task, payload: TaskCreate): TaskUpdate {
  const changes: TaskUpdate = {};
  if (payload.title !== task.title) changes.title = payload.title;
  if ((payload.description ?? null) !== task.description) changes.description = payload.description ?? null;
  if (payload.status !== task.status) changes.status = payload.status;
  if (payload.due_date !== task.due_date) changes.due_date = payload.due_date;
  if (payload.category_id !== task.category_id) changes.category_id = payload.category_id;
  return changes;
}
