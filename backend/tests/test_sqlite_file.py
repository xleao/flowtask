"""SQLite en archivo (el modo por defecto para correr el proyecto sin instalar nada).

Las demás pruebas usan SQLite en memoria o PostgreSQL; estas cubren lo propio del
archivo: los PRAGMA de la conexión y escrituras concurrentes reales.
"""

from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.database import build_engine
from main import create_app
from tests.conftest import make_settings


def test_file_connection_enables_foreign_keys_wal_and_busy_timeout(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'flowtask.db'}", statement_timeout_ms=3000)
    with engine.connect() as conn:
        assert conn.execute(text("PRAGMA foreign_keys")).scalar() == 1
        assert conn.execute(text("PRAGMA journal_mode")).scalar() == "wal"
        assert conn.execute(text("PRAGMA busy_timeout")).scalar() == 3000
    engine.dispose()


def test_concurrent_writes_on_a_file_database_do_not_lock(tmp_path):
    app = create_app(make_settings(database_url=f"sqlite:///{tmp_path / 'flowtask.db'}"))
    with TestClient(app) as client:

        def create(i: int) -> int:
            body = {"title": f"Tarea {i}", "due_date": "2026-10-30", "category_id": 1}
            return client.post("/tasks", json=body).status_code

        with ThreadPoolExecutor(max_workers=8) as pool:
            codes = list(pool.map(create, range(20)))

        assert codes == [201] * 20
        assert client.get("/tasks", params={"limit": 100}).headers["X-Total-Count"] == "20"
    app.state.engine.dispose()
