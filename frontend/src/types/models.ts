// Contratos tipados de la API. Espejo de app/schemas en el backend.

export const TASK_STATUSES = ["Pendiente", "En Progreso", "Completada"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string; // ISO "YYYY-MM-DD"
  category_id: number;
  category: Category;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  due_date: string;
  category_id: number;
}

export type TaskUpdate = Partial<TaskCreate>;

export interface TaskFilters {
  status?: TaskStatus;
  categoryId?: number;
  q?: string;
  limit: number;
  offset: number;
}

export interface TaskSummary {
  total: number;
  by_status: Record<TaskStatus, number>;
  overdue: number;
  due_today: number;
  by_category: Record<string, number>; // claves JSON = id de categoría como string
}

export interface Page<T> {
  items: T[];
  total: number;
}
