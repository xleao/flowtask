import type { Page, Task, TaskCreate, TaskFilters, TaskSummary, TaskUpdate } from "../types/models";
import { todayISO } from "../utils/dates";
import { request } from "./apiClient";

export const TaskService = {
  async summary(categoryId?: number): Promise<TaskSummary> {
    // "Hoy" del usuario, no del servidor: define qué cuenta como vencida.
    const params = new URLSearchParams({ today: todayISO() });
    if (categoryId) params.set("category_id", String(categoryId));
    return (await request<TaskSummary>(`/tasks/summary?${params}`)).data;
  },

  async list(filters: TaskFilters): Promise<Page<Task>> {
    const params = new URLSearchParams({ limit: String(filters.limit), offset: String(filters.offset) });
    if (filters.status) params.set("status", filters.status);
    if (filters.categoryId) params.set("category_id", String(filters.categoryId));
    if (filters.q) params.set("q", filters.q);

    const { data, headers } = await request<Task[]>(`/tasks?${params}`);
    return { items: data, total: Number(headers.get("X-Total-Count") ?? data.length) };
  },

  async create(payload: TaskCreate): Promise<Task> {
    return (await request<Task>("/tasks", { method: "POST", body: JSON.stringify(payload) })).data;
  },

  async update(id: number, changes: TaskUpdate): Promise<Task> {
    return (await request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(changes) })).data;
  },

  async remove(id: number): Promise<void> {
    await request<null>(`/tasks/${id}`, { method: "DELETE" });
  },
};
