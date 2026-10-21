from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.core.errors import CONCURRENT_EDIT, BusinessRuleError, NotFoundError, PreconditionFailedError
from app.models import Task, TaskStatus
from app.repositories import CategoryRepository, TaskRepository
from app.schemas import TaskCreate, TaskSummary, TaskUpdate

TASK_NOT_FOUND = "Tarea no encontrada"


class TaskService:
    def __init__(self, db: Session):
        self.db = db
        self.tasks = TaskRepository(db)
        self.categories = CategoryRepository(db)

    def list_tasks(
        self,
        *,
        status: TaskStatus | None,
        category_id: int | None,
        q: str | None = None,
        limit: int,
        offset: int,
    ) -> tuple[list[Task], int]:
        return self.tasks.search(status=status, category_id=category_id, q=q, limit=limit, offset=offset)

    def summary(self, *, category_id: int | None, today: date) -> TaskSummary:
        by_status, overdue, due_today = self.tasks.count_by_status(category_id=category_id, today=today)
        return TaskSummary(
            total=sum(by_status.values()),
            by_status={s: by_status.get(s.value, 0) for s in TaskStatus},  # siempre los 3 estados
            overdue=overdue,
            due_today=due_today,
            by_category=self.tasks.count_by_category(),
        )

    def get_task(self, task_id: int) -> Task:
        task = self.tasks.get(task_id)
        if task is None:
            raise NotFoundError(TASK_NOT_FOUND)
        return task

    def create_task(self, data: TaskCreate) -> Task:
        self._ensure_category_exists(data.category_id)
        task = Task(
            title=data.title,
            description=data.description,
            status=data.status.value,
            due_date=data.due_date,
            category_id=data.category_id,
        )
        self._sync_completed_at(task)
        self.tasks.add(task)
        self.db.commit()
        return self._reload(task)

    def update_task(self, task_id: int, data: TaskUpdate, *, if_match: list[str] | None = None) -> Task:
        task = self.get_task(task_id)
        self._check_precondition(task, if_match)
        changes = data.model_dump(exclude_unset=True)

        if "category_id" in changes and changes["category_id"] != task.category_id:
            self._ensure_category_exists(changes["category_id"])
        if "status" in changes:
            changes["status"] = changes["status"].value

        for field, value in changes.items():
            setattr(task, field, value)
        self._sync_completed_at(task)
        self.db.commit()
        return self._reload(task)

    def delete_task(self, task_id: int, *, if_match: list[str] | None = None) -> None:
        task = self.get_task(task_id)
        self._check_precondition(task, if_match)
        self.tasks.delete(task)
        self.db.commit()

    # --- reglas internas -------------------------------------------------

    @staticmethod
    def _check_precondition(task: Task, if_match: list[str] | None) -> None:
        """If-Match opcional: sin cabecera, gana la última escritura (contrato simple
        del PDF). Con cabecera, solo se modifica la versión que el cliente vio."""
        if if_match is None or "*" in if_match:
            return
        if task.etag not in if_match:
            raise PreconditionFailedError(CONCURRENT_EDIT)

    def _ensure_category_exists(self, category_id: int) -> None:
        # 422 y no 404: la URL (/tasks) existe; lo inválido es una referencia del body.
        if self.categories.get(category_id) is None:
            raise BusinessRuleError(f"La categoría con id {category_id} no existe")

    @staticmethod
    def _sync_completed_at(task: Task) -> None:
        """completed_at refleja el estado: se marca al completar y se limpia si se reabre."""
        if task.status == TaskStatus.COMPLETADA.value:
            task.completed_at = task.completed_at or datetime.now(timezone.utc)
        else:
            task.completed_at = None

    def _reload(self, task: Task) -> Task:
        # Trae created_at/updated_at generados por la base y la categoría actualizada.
        self.db.refresh(task)
        return task
