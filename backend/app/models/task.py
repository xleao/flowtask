from datetime import date, datetime
from enum import Enum

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.category import Category


class TaskStatus(str, Enum):
    PENDIENTE = "Pendiente"
    EN_PROGRESO = "En Progreso"
    COMPLETADA = "Completada"


_STATUS_SQL = ", ".join(f"'{s.value}'" for s in TaskStatus)


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        # Defensa en profundidad: Pydantic valida en la API, pero la base no
        # acepta datos inválidos aunque alguien escriba por fuera de ella.
        CheckConstraint(f"status IN ({_STATUS_SQL})", name="status_valid"),
        CheckConstraint("length(trim(title)) > 0", name="title_not_blank"),
        # Filtro principal del tablero: por estado, ordenado por fecha límite.
        Index("ix_tasks_status_due_date", "status", "due_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), default=TaskStatus.PENDIENTE.value, server_default=TaskStatus.PENDIENTE.value
    )
    due_date: Mapped[date] = mapped_column(Date)
    # RESTRICT: borrar una categoría con tareas dejaría huérfanos; la base lo impide.
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Bloqueo optimista: SQLAlchemy incrementa `version` en cada UPDATE y agrega
    # `WHERE version = :leída`; si otro request la cambió antes, lanza StaleDataError.
    version: Mapped[int] = mapped_column(server_default="1")

    category: Mapped[Category] = relationship(back_populates="tasks", lazy="joined")

    # mypy exige el tipo de DeclarativeBase (no ClassVar); por eso el noqa de ruff.
    __mapper_args__ = {"version_id_col": version}  # noqa: RUF012

    @property
    def etag(self) -> str:
        return f'"{self.id}-{self.version}"'

    def __repr__(self) -> str:
        return f"<Task id={self.id} status={self.status!r}>"
