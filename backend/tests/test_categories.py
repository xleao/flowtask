"""Caso 1: inicialización del sistema y categorías base."""

from sqlalchemy.orm import Session

from app.services import CategoryService


def test_seed_creates_at_least_three_default_categories(client):
    resp = client.get("/categories")

    assert resp.status_code == 200
    names = {c["name"] for c in resp.json()}
    assert {"Trabajo", "Personal", "Urgente"} <= names
    assert all({"id", "name", "description"} <= c.keys() for c in resp.json())


def test_seed_is_idempotent(client):
    before = len(client.get("/categories").json())

    with Session(client.app.state.engine) as session:
        created = CategoryService(session).seed_defaults()

    assert created == 0
    assert len(client.get("/categories").json()) == before
