"""Controladores HTTP de tareas: solo traducen HTTP <-> servicio, sin lógica de negocio."""

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, TaskStatus
from app.schemas import TaskCreate, TaskRead, TaskSummary, TaskUpdate
from app.services import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service(db: Annotated[Session, Depends(get_db)]) -> TaskService:
    return TaskService(db)


Service = Annotated[TaskService, Depends(get_task_service)]
TaskId = Annotated[int, Path(gt=0, description="ID de la tarea")]
IfMatch = Annotated[
    str | None,
    Header(description='ETag recibido al leer la tarea (ej. `"12-3"`). Si ya no coincide → 412'),
]

NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {
        "description": "Tarea no encontrada",
        "content": {"application/json": {"example": {"detail": "Tarea no encontrada"}}},
    }
}
PRECONDITION: dict[int | str, dict[str, Any]] = {
    412: {"description": "La tarea cambió desde que se leyó (If-Match no coincide)"},
    409: {"description": "Edición concurrente detectada al guardar"},
}


def _parse_if_match(header: str | None) -> list[str] | None:
    # `If-Match: "1-2", W/"1-3"` → ['"1-2"', '"1-3"']. La comparación débil basta
    # porque el ETag se deriva de la versión, no de los bytes de la respuesta.
    if header is None:
        return None
    return [tag.strip().removeprefix("W/") for tag in header.split(",") if tag.strip()]


def _with_etag(response: Response, task: Task) -> Task:
    response.headers["ETag"] = task.etag
    return task


@router.get("", response_model=list[TaskRead], summary="Listar tareas (filtros, búsqueda y paginación)")
def list_tasks(
    response: Response,
    service: Service,
    status_filter: Annotated[TaskStatus | None, Query(alias="status", description="Filtrar por estado")] = None,
    category_id: Annotated[int | None, Query(gt=0, description="Filtrar por categoría")] = None,
    q: Annotated[str | None, Query(min_length=1, max_length=100, description="Busca en título y descripción")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Task]:
    items, total = service.list_tasks(
        status=status_filter, category_id=category_id, q=q.strip() if q else None, limit=limit, offset=offset
    )
    # El cuerpo sigue siendo un arreglo plano (contrato del PDF); el total va en cabecera.
    response.headers["X-Total-Count"] = str(total)
    return items


# Declarada antes de /{task_id} para que "summary" no se interprete como id.
@router.get("/summary", response_model=TaskSummary, summary="Conteos por estado, vencidas y por categoría")
def task_summary(
    service: Service,
    category_id: Annotated[int | None, Query(gt=0, description="Acotar los conteos por estado a una categoría")] = None,
    today: Annotated[
        date | None,
        Query(description="Fecha de referencia del cliente (su zona horaria). Por defecto, la del servidor"),
    ] = None,
) -> TaskSummary:
    return service.summary(category_id=category_id, today=today or date.today())


@router.get("/{task_id}", response_model=TaskRead, responses=NOT_FOUND, summary="Obtener una tarea")
def get_task(task_id: TaskId, response: Response, service: Service) -> Task:
    return _with_etag(response, service.get_task(task_id))


@router.post(
    "",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
    responses={422: {"description": "Datos inválidos o categoría inexistente"}},
    summary="Crear tarea",
)
def create_task(data: TaskCreate, response: Response, service: Service) -> Task:
    task = service.create_task(data)
    response.headers["Location"] = f"/tasks/{task.id}"
    return _with_etag(response, task)


@router.patch(
    "/{task_id}", response_model=TaskRead, responses=NOT_FOUND | PRECONDITION, summary="Actualizar tarea (parcial)"
)
def update_task(
    task_id: TaskId, data: TaskUpdate, response: Response, service: Service, if_match: IfMatch = None
) -> Task:
    return _with_etag(response, service.update_task(task_id, data, if_match=_parse_if_match(if_match)))


@router.delete(
    "/{task_id}", status_code=status.HTTP_204_NO_CONTENT, responses=NOT_FOUND | PRECONDITION, summary="Eliminar tarea"
)
def delete_task(task_id: TaskId, service: Service, if_match: IfMatch = None) -> Response:
    service.delete_task(task_id, if_match=_parse_if_match(if_match))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
