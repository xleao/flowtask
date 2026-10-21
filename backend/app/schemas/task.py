"""Contratos de entrada/salida de la API de tareas.

Acá vive la validación de FORMATO (tipos, longitudes, enum). Las reglas que
dependen del estado del sistema — que la categoría exista — viven en
TaskService, porque Pydantic no tiene acceso a la base.
"""

from datetime import date, datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints, model_validator

from app.models.task import TaskStatus
from app.schemas.category import CategoryRead

MAX_YEARS_AHEAD = 5


def _blank_to_none(v: object) -> object:
    return None if isinstance(v, str) and not v.strip() else v


def _due_date_upper_bound(v: date) -> date:
    # Atrapa typos como 20266-01-01 o 2062 en vez de 2026.
    if v.year > date.today().year + MAX_YEARS_AHEAD:
        raise ValueError(f"La fecha límite no puede superar {MAX_YEARS_AHEAD} años desde hoy")
    return v


Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Description = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None,
    BeforeValidator(_blank_to_none),
]
DueDate = Annotated[date, AfterValidator(_due_date_upper_bound)]
CategoryId = Annotated[int, Field(gt=0)]


class TaskCreate(BaseModel):
    title: Title
    description: Description = None
    status: TaskStatus = TaskStatus.PENDIENTE
    due_date: DueDate
    category_id: CategoryId

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Preparar informe mensual",
                "description": "Consolidar indicadores de octubre",
                "status": "Pendiente",
                "due_date": "2026-10-30",
                "category_id": 1,
            }
        }
    )


class TaskUpdate(BaseModel):
    """PATCH parcial: solo se modifican los campos enviados."""

    title: Title | None = None
    description: Description = None
    status: TaskStatus | None = None
    due_date: DueDate | None = None
    category_id: CategoryId | None = None

    model_config = ConfigDict(json_schema_extra={"example": {"status": "Completada"}})

    @model_validator(mode="after")
    def _non_nullable_fields(self) -> "TaskUpdate":
        if not self.model_fields_set:
            raise ValueError("Debes enviar al menos un campo a actualizar")
        for field in ("title", "status", "due_date", "category_id"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"El campo '{field}' no puede ser null")
        return self


class TaskSummary(BaseModel):
    """Conteos para el tablero (pestañas, sidebar, progreso)."""

    total: int
    by_status: dict[TaskStatus, int]
    overdue: int
    due_today: int
    by_category: dict[int, int]


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    status: TaskStatus
    due_date: date
    category_id: int
    category: CategoryRead
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    version: int = Field(description="Se incrementa en cada cambio. También viaja como ETag")
