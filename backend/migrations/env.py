"""Entorno de Alembic.

Dos modos de uso:
- CLI (`alembic upgrade head`): crea su propio engine desde DATABASE_URL.
- Programático (seed.py / arranque de la app / tests): recibe una conexión ya
  abierta en config.attributes["connection"] y la reutiliza (sirve también para
  SQLite en memoria, donde otra conexión sería otra base).
"""

import logging

from alembic import context
from sqlalchemy.engine import Connection

import app.models  # noqa: F401  — registra los modelos en Base.metadata
from app.core.config import get_settings
from app.database import Base, build_engine

config = context.config
target_metadata = Base.metadata


def _run(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        # SQLite no soporta ALTER de constraints: Alembic recrea la tabla.
        render_as_batch=connection.dialect.name == "sqlite",
    )
    with context.begin_transaction():
        context.run_migrations()


def run_offline() -> None:
    """`alembic upgrade head --sql`: genera el SQL para revisarlo o aplicarlo a mano."""
    context.configure(url=get_settings().database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_online() -> None:
    shared = config.attributes.get("connection")
    if shared is not None:
        _run(shared)
        return

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = build_engine(get_settings().database_url)
    try:
        with engine.begin() as connection:
            _run(connection)
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_offline()
else:
    run_online()
