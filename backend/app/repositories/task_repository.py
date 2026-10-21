from datetime import date

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.orm import Session

from app.models import Task, TaskStatus


class TaskRepository:
    """Único lugar que arma consultas SQL sobre tareas. No hace commit: eso es
    decisión del servicio (unidad de trabajo)."""

    def __init__(self, db: Session):
        self.db = db

    def search(
        self,
        *,
        status: TaskStatus | None = None,
        category_id: int | None = None,
        q: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        filters: list[ColumnElement[bool]] = []
        if status is not None:
            filters.append(Task.status == status.value)
        if category_id is not None:
            filters.append(Task.category_id == category_id)
        if q:
            # autoescape: un "%" o "_" tipeado por el usuario se busca literal, no como comodín.
            filters.append(
                or_(Task.title.icontains(q, autoescape=True), Task.description.icontains(q, autoescape=True))
            )

        total = self.db.scalar(select(func.count()).select_from(Task).where(*filters)) or 0
        # category es lazy="joined": un solo SELECT con JOIN, sin N+1.
        stmt = select(Task).where(*filters).order_by(Task.due_date.asc(), Task.id.asc()).limit(limit).offset(offset)
        return list(self.db.scalars(stmt).unique()), total

    def count_by_status(self, *, category_id: int | None, today: date) -> tuple[dict[str, int], int, int]:
        """Conteos por estado + vencidas + que vencen hoy, en un solo SELECT agregado."""
        open_ = Task.status != TaskStatus.COMPLETADA.value
        stmt = select(
            Task.status,
            func.count(),
            func.count().filter(open_, Task.due_date < today),
            func.count().filter(open_, Task.due_date == today),
        ).group_by(Task.status)
        if category_id is not None:
            stmt = stmt.where(Task.category_id == category_id)

        by_status, overdue, due_today = {}, 0, 0
        for status, total, late, today_count in self.db.execute(stmt):
            by_status[status] = total
            overdue += late
            due_today += today_count
        return by_status, overdue, due_today

    def count_by_category(self) -> dict[int, int]:
        stmt = select(Task.category_id, func.count()).group_by(Task.category_id)
        return {cid: n for cid, n in self.db.execute(stmt)}

    def get(self, task_id: int) -> Task | None:
        return self.db.get(Task, task_id)

    def add(self, task: Task) -> Task:
        self.db.add(task)
        self.db.flush()
        return task

    def delete(self, task: Task) -> None:
        self.db.delete(task)
        self.db.flush()
