"""Punto de entrada de la API FlowTask.

uvicorn main:app --reload --port 8010
"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.database import build_engine, build_session_factory
from app.routers import categories, tasks
from seed import init_db

API_VERSION = "1.1.0"
logger = logging.getLogger("flowtask")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level, settings.log_format)

    engine = build_engine(settings.database_url, statement_timeout_ms=settings.db_statement_timeout_ms)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if settings.init_db_on_startup:
            init_db(engine)
        yield
        engine.dispose()

    app = FastAPI(
        title="FlowTask API",
        description="Gestor de tareas por categorías — prueba técnica Fullstack.",
        version=API_VERSION,
        lifespan=lifespan,
        # En producción no se publica el mapa completo de la API.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
    )
    app.state.engine = engine
    app.state.session_factory = build_session_factory(engine)

    # --- Rate limiting por IP (anti abuso / fuerza bruta) -----------------
    # Detrás de Nginx, uvicorn --proxy-headers hace que client.host sea la IP real.
    app.state.limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[settings.rate_limit],
        enabled=settings.rate_limit_enabled,
        storage_uri=settings.rate_limit_storage_uri,
        headers_enabled=True,
    )

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limited(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(
            status_code=429,
            content={"detail": "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo."},
            headers={"Retry-After": "60"},
        )

    register_exception_handlers(app)

    # --- Middleware (el último agregado es el más externo) ----------------
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        # CORS estricto: solo los orígenes del frontend, solo los métodos que existen.
        # En desarrollo, además, cualquier puerto de localhost (ver config.py).
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=False,  # la API no usa cookies
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Request-ID", "If-Match"],
        expose_headers=["X-Total-Count", "X-Request-ID", "ETag", "Location"],
        max_age=600,
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_host_list)
    # Si el navegador reporta un error de CORS, el primer dato a mirar es este.
    logger.info(
        "CORS: orígenes %s%s",
        settings.cors_origin_list,
        " + localhost en cualquier puerto (desarrollo)" if settings.cors_origin_regex else "",
    )

    app.include_router(categories.router)
    app.include_router(tasks.router)

    @app.get("/health/live", tags=["health"], summary="Liveness: el proceso responde")
    def live() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health", tags=["health"], summary="Readiness: API, base de datos y versión del esquema")
    def health() -> JSONResponse:
        try:
            with engine.connect() as conn:
                schema = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        except Exception:
            return JSONResponse(status_code=503, content={"status": "degraded", "database": "unavailable"})
        return JSONResponse(content={"status": "ok", "database": "ok", "schema": schema, "version": API_VERSION})

    return app


app = create_app()
