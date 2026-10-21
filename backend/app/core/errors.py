"""Errores de dominio + handlers globales.

Los servicios lanzan DomainError sin saber nada de HTTP más allá de su código;
acá se traducen a la respuesta estándar {"detail": "..."}. Cualquier excepción
no prevista termina en un 500 genérico: el stack trace va al log (con request_id
para correlacionar), nunca al cliente.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm.exc import StaleDataError

log = logging.getLogger("flowtask.errors")


class DomainError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class NotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND


class BusinessRuleError(DomainError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY


class PreconditionFailedError(DomainError):
    """El cliente editó una versión que ya no es la actual (If-Match no coincide)."""

    status_code = status.HTTP_412_PRECONDITION_FAILED


CONCURRENT_EDIT = "La tarea fue modificada por otra persona mientras la editabas. Recarga para ver la versión actual."


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "-")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain(request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(StaleDataError)
    async def _stale(request: Request, exc: StaleDataError) -> JSONResponse:
        # Dos PATCH simultáneos leyeron la misma versión: el segundo UPDATE no
        # encuentra la fila con esa versión y SQLAlchemy lo detecta.
        log.info("concurrent_update_rejected", extra={"path": request.url.path})
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": CONCURRENT_EDIT})

    @app.exception_handler(IntegrityError)
    async def _integrity(request: Request, exc: IntegrityError) -> JSONResponse:
        # Red de seguridad: los servicios validan antes, pero una carrera entre
        # dos requests puede llegar igual al constraint de la base.
        log.warning("integrity_error", extra={"error": str(exc.orig)})
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "La operación viola una restricción de integridad de datos."},
        )

    @app.exception_handler(OperationalError)
    async def _db_down(request: Request, exc: OperationalError) -> JSONResponse:
        log.error("database_unavailable", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Base de datos no disponible. Intenta nuevamente en unos segundos."},
            headers={"Retry-After": "5"},
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        rid = _request_id(request)
        log.error("unhandled_error", exc_info=exc, extra={"path": request.url.path, "request_id": rid})
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Error interno del servidor.", "request_id": rid},
        )
