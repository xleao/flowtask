"""Conexión a la base de datos y dependencia get_db.

El engine vive en app.state (lo crea main.create_app), no como global de módulo:
así los tests levantan la app contra SQLite en memoria sin monkeypatching.
"""

from collections.abc import Iterator
from typing import Any

from fastapi import Request
from sqlalchemy import Engine, MetaData, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Nombres de constraints deterministas: Alembic puede generar/dropear por nombre
# y los mensajes de error de la base son legibles.
NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def _unicode_lower(value: str | None) -> str | None:
    return value.lower() if isinstance(value, str) else value


def build_engine(url: str, *, statement_timeout_ms: int = 0) -> Engine:
    if url.startswith("sqlite"):
        in_memory = url in ("sqlite://", "sqlite:///:memory:")
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            # En memoria cada conexión sería una base distinta: se comparte una sola.
            poolclass=StaticPool if in_memory else None,
        )

        @event.listens_for(engine, "connect")
        def _configure_sqlite(dbapi_conn: Any, _record: Any) -> None:
            dbapi_conn.execute("PRAGMA foreign_keys=ON")  # SQLite ignora las FK si no se activan por conexión
            # El lower() nativo de SQLite solo entiende ASCII: "Área" no coincidiría con "área".
            # Con el de Python, la búsqueda (ILIKE) y la unicidad de categorías se comportan
            # igual que en PostgreSQL.
            dbapi_conn.create_function("lower", 1, _unicode_lower, deterministic=True)
            if not in_memory:
                # WAL: las lecturas no bloquean a las escrituras (varias peticiones a la vez).
                dbapi_conn.execute("PRAGMA journal_mode=WAL")
                # Una escritura concurrente espera su turno en vez de fallar con "database is locked".
                dbapi_conn.execute(f"PRAGMA busy_timeout={statement_timeout_ms or 5000}")

        return engine

    connect_args = {}
    if statement_timeout_ms and url.startswith("postgresql"):
        # Una consulta colgada no retiene una conexión del pool indefinidamente.
        connect_args["options"] = f"-c statement_timeout={statement_timeout_ms}"

    return create_engine(
        url,
        connect_args=connect_args,
        pool_pre_ping=True,  # descarta conexiones muertas tras un reinicio de Postgres
        pool_size=10,
        max_overflow=10,
        pool_recycle=1800,
    )


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    # expire_on_commit=False: el objeto devuelto tras commit se serializa sin re-consultar.
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db(request: Request) -> Iterator[Session]:
    session: Session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()
