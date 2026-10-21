import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FilterBar } from "./components/FilterBar";
import { GridBackground } from "./components/GridBackground";
import { LoadError } from "./components/LoadError";
import { Modal } from "./components/Modal";
import { Pagination } from "./components/Pagination";
import { QuickCapture } from "./components/QuickCapture";
import { Sidebar } from "./components/Sidebar";
import { TaskForm } from "./components/TaskForm";
import { TaskList } from "./components/TaskList";
import { Toasts, useToasts } from "./components/Toasts";
import { Topbar } from "./components/Topbar";
import { useCategories } from "./hooks/useCategories";
import { useEffectsMode } from "./hooks/useEffectsMode";
import { useHotkey } from "./hooks/useHotkey";
import { useTaskActions } from "./hooks/useTaskActions";
import { PAGE_SIZE, useTasks, type Filters } from "./hooks/useTasks";
import type { Task, TaskCreate } from "./types/models";

type FormModal = { mode: "create" } | { mode: "edit"; task: Task } | null;

const NO_FILTERS: Filters = { status: "", categoryId: "", q: "", page: 1 };

/**
 * Orquestador del tablero: guarda el estado de la vista (filtros, modales) y conecta
 * los hooks de datos con los componentes. No hace HTTP ni tiene reglas de negocio.
 */
export default function App() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [formModal, setFormModal] = useState<FormModal>(null);
  const [toDelete, setToDelete] = useState<Task | null>(null);
  // Visibles por defecto: al completar una tarea debe verse el cambio, no desaparecer.
  const [showCompleted, setShowCompleted] = useState(true);
  // Cambiar la key remonta el buscador: así "Ver todas las tareas" también lo vacía.
  const [searchKey, setSearchKey] = useState(0);

  const { toasts, notify, dismiss } = useToasts();
  const { categories, reloadCategories } = useCategories(notify);
  const effects = useEffectsMode(notify);
  const { tasks, total, summary, loading, loadError, reload, create, update, remove } = useTasks(filters);
  const actions = useTaskActions({ create, update, remove }, notify);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = filters.status !== "" || filters.categoryId !== "" || filters.q !== "";
  const selectedCategory = categories.find((c) => c.id === filters.categoryId);
  const activeCount = summary ? summary.by_status.Pendiente + summary.by_status["En Progreso"] : total;
  // Categoría a la que va la captura rápida: la seleccionada o, en "Todas", la primera.
  const quickCategory = selectedCategory ?? categories[0];

  const openCreate = useCallback(() => setFormModal({ mode: "create" }), []);
  const closeForm = () => setFormModal(null);
  const toggleCompleted = () => setShowCompleted((s) => !s);
  const updateFilters = (changes: Partial<Filters>) => setFilters((f) => ({ ...f, page: 1, ...changes }));

  useHotkey("n", openCreate); // Ctrl+K / ⌘K lo maneja SearchBox

  // Si se borra la última tarea de la última página, retrocede una página.
  useEffect(() => {
    if (!loading && filters.page > totalPages) setFilters((f) => ({ ...f, page: totalPages }));
  }, [loading, filters.page, totalPages]);

  // Estable (useCallback): SearchBox lo usa como dependencia de su debounce.
  const handleSearch = useCallback((q: string) => {
    setFilters((f) => (f.q === q ? f : { ...f, q, page: 1 }));
  }, []);

  function resetFilters() {
    setFilters(NO_FILTERS);
    setSearchKey((k) => k + 1);
  }

  async function handleSubmit(payload: TaskCreate) {
    await actions.save(payload, formModal?.mode === "edit" ? formModal.task : undefined);
    closeForm();
  }

  function confirmDelete() {
    if (!toDelete) return;
    void actions.deleteTask(toDelete);
    setToDelete(null);
  }

  return (
    <div className="tron-app">
      <GridBackground />

      <Sidebar
        categories={categories}
        summary={summary}
        selected={filters.categoryId}
        online={!loadError}
        liteEffects={effects.lite}
        onToggleEffects={effects.toggle}
        onSelect={(categoryId) => updateFilters({ categoryId })}
        onRefresh={() => {
          void reload();
          reloadCategories();
          notify("success", "Tareas sincronizadas.");
        }}
      />

      <div className="tron-viewport">
        <Topbar
          category={selectedCategory}
          total={total}
          searchKey={searchKey}
          onSearch={handleSearch}
          onNewTask={openCreate}
        />

        <main className="tron-main">
          <FilterBar
            status={filters.status}
            summary={summary}
            showCompleted={showCompleted || filters.status === "Completada"}
            onToggleCompleted={toggleCompleted}
            onChange={(status) => updateFilters({ status })}
          />

          <QuickCapture category={quickCategory} onCreate={actions.quickCreate} onNoCategory={openCreate} />

          {loadError ? (
            <LoadError
              message={loadError}
              onRetry={() => {
                void reload();
                if (!categories.length) reloadCategories();
              }}
            />
          ) : (
            <TaskList
              tasks={tasks}
              loading={loading}
              hasFilters={hasFilters}
              statusFilter={filters.status}
              showCompleted={showCompleted}
              onToggleCompleted={toggleCompleted}
              onCreate={openCreate}
              onClearFilters={resetFilters}
              onToggleComplete={actions.toggleComplete}
              onStatusChange={actions.changeStatus}
              onEdit={(task) => setFormModal({ mode: "edit", task })}
              onDelete={setToDelete}
            />
          )}

          <Pagination
            page={filters.page}
            totalPages={totalPages}
            total={total}
            activeCount={activeCount}
            pageSize={PAGE_SIZE}
            onChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        </main>
      </div>

      <Modal
        open={formModal !== null}
        title={formModal?.mode === "edit" ? "Editar tarea" : "Nueva tarea"}
        onClose={closeForm}
      >
        {formModal && (
          <TaskForm
            key={formModal.mode === "edit" ? formModal.task.id : "new"}
            categories={categories}
            task={formModal.mode === "edit" ? formModal.task : undefined}
            defaultCategoryId={filters.categoryId || undefined}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="¿Eliminar esta tarea?"
        message={
          toDelete
            ? `"${toDelete.title}" se eliminará de forma permanente.`
            : "Esta tarea se eliminará de forma permanente."
        }
        confirmLabel="Eliminar tarea"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
