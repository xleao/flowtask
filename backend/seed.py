"""Inicializa la base: aplica las migraciones Alembic pendientes y siembra las
categorías base.

Uso:  python seed.py
Idempotente: se puede correr las veces que sea sin duplicar datos. La API hace
lo mismo al arrancar si INIT_DB_ON_STARTUP=true (valor por defecto en desarrollo).
"""

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, inspect
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import build_engine
from app.services import CategoryService

log = logging.getLogger("flowtask.seed")

BACKEND_DIR = Path(__file__).resolve().parent
BASELINE_REVISION = "0001"


def alembic_config() -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    return cfg


def migrate(engine: Engine, revision: str = "head") -> None:
    cfg = alembic_config()
    with engine.begin() as connection:
        tables = set(inspect(connection).get_table_names())
        # Base creada antes de usar Alembic (create_all): tiene el esquema 0001 pero
        # no la tabla de versiones. Se marca como 0001 y se sigue desde ahí, en vez
        # de fallar con "table already exists".
        if "tasks" in tables and "alembic_version" not in tables:
            log.info("Base existente sin historial de migraciones: baseline en %s", BASELINE_REVISION)
            cfg.attributes["connection"] = connection
            command.stamp(cfg, BASELINE_REVISION)
        cfg.attributes["connection"] = connection
        command.upgrade(cfg, revision)


def init_db(engine: Engine) -> int:
    migrate(engine)
    with Session(engine) as session:
        return CategoryService(session).seed_defaults()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    settings = get_settings()
    db_engine = build_engine(settings.database_url, statement_timeout_ms=settings.db_statement_timeout_ms)
    created = init_db(db_engine)
    log.info("Base al día. Categorías nuevas: %d", created)
