"""Cada test levanta la app real con una base limpia, migrada con Alembic y sembrada.

- Por defecto: SQLite en memoria (rápido, sin instalar nada).
- Con TEST_DATABASE_URL=postgresql+psycopg://...: PostgreSQL real (así corre en CI).
  Se borra el esquema antes de cada test, así que NUNCA apuntar a una base con datos.
"""

import os
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import Settings
from app.database import build_engine
from main import create_app

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite://")


def reset_database(url: str) -> None:
    if url.startswith("sqlite"):
        return  # en memoria: cada engine nuevo ya es una base vacía
    engine = build_engine(url)
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS tasks, categories, alembic_version CASCADE"))
    engine.dispose()


def make_settings(**overrides: Any) -> Settings:
    base: dict[str, Any] = dict(
        environment="test",
        database_url=TEST_DATABASE_URL,
        cors_origins="http://localhost:5180",
        allowed_hosts="testserver",
        rate_limit_enabled=False,
        init_db_on_startup=True,  # migra + siembra, igual que en dev
    )
    return Settings(_env_file=None, **(base | overrides))  # type: ignore[call-arg]


def fresh_app(**overrides: Any) -> FastAPI:
    settings = make_settings(**overrides)
    reset_database(settings.database_url)
    return create_app(settings)


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(fresh_app()) as c:
        yield c


@pytest.fixture
def category_id(client: TestClient) -> int:
    return int(client.get("/categories").json()[0]["id"])


@pytest.fixture
def make_task(client: TestClient, category_id: int) -> Callable[..., dict[str, Any]]:
    def _make(**fields: Any) -> dict[str, Any]:
        payload = {"title": "Tarea de prueba", "due_date": "2026-12-31", "category_id": category_id} | fields
        resp = client.post("/tasks", json=payload)
        assert resp.status_code == 201, resp.text
        body: dict[str, Any] = resp.json()
        return body

    return _make
