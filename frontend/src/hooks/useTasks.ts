import { useCallback, useEffect, useRef, useState } from "react";
import { TaskService } from "../services/taskService";
import type { Task, TaskCreate, TaskStatus, TaskSummary, TaskUpdate } from "../types/models";

export const PAGE_SIZE = 12;

export interface Filters {
  status: TaskStatus | "";
  categoryId: number | "";
  q: string; // búsqueda en el backend (título y descripción), en todas las páginas
  page: number;
}

/**
 * Estado del tablero: carga paginada con filtros en el backend, resumen de
 * conteos y mutaciones optimistas (la UI cambia al instante y se revierte si
 * la API falla).
 */
export function useTasks(filters: Filters) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Si el usuario cambia de filtro rápido, solo la última respuesta pinta la lista.
  const lastRequest = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++lastRequest.current;
    setLoading(true);
    try {
      const [page, counts] = await Promise.all([
        TaskService.list({
          status: filters.status || undefined,
          categoryId: filters.categoryId || undefined,
          q: filters.q || undefined,
          limit: PAGE_SIZE,
          offset: (filters.page - 1) * PAGE_SIZE,
        }),
        TaskService.summary(filters.categoryId || undefined),
      ]);
      if (requestId !== lastRequest.current) return;
      setTasks(page.items);
      setTotal(page.total);
      setSummary(counts);
      setLoadError(null);
    } catch (err) {
      if (requestId === lastRequest.current) setLoadError((err as Error).message);
    } finally {
      if (requestId === lastRequest.current) setLoading(false);
    }
  }, [filters.status, filters.categoryId, filters.q, filters.page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (payload: TaskCreate) => {
      await TaskService.create(payload);
      await reload(); // la nueva tarea puede caer en otra página/orden: se pide la vista real
    },
    [reload],
  );

  const update = useCallback(
    async (id: number, changes: TaskUpdate) => {
      const previous = tasks;
      setTasks((list) => list.map((t) => (t.id === id ? ({ ...t, ...changes } as Task) : t)));
      try {
        const saved = await TaskService.update(id, changes);
        setTasks((list) => list.map((t) => (t.id === id ? saved : t)));
      } catch (err) {
        setTasks(previous);
        throw err;
      }
      void reload(); // refresca conteos y, con filtro activo, la pertenencia a la vista
    },
    [tasks, reload],
  );

  const remove = useCallback(
    async (id: number) => {
      const previous = tasks;
      setTasks((list) => list.filter((t) => t.id !== id));
      setTotal((n) => n - 1);
      try {
        await TaskService.remove(id);
      } catch (err) {
        setTasks(previous);
        setTotal((n) => n + 1);
        throw err;
      }
      void reload(); // rellena el hueco con la siguiente tarea de la página
    },
    [tasks, reload],
  );

  return { tasks, total, summary, loading, loadError, reload, create, update, remove };
}
