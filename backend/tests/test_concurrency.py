"""Bloqueo optimista: ETag / If-Match evita que una edición pise otra sin aviso."""

from sqlalchemy.orm import Session

from app.models import Task


def test_read_and_write_responses_carry_etag(client, make_task):
    task = make_task()
    resp = client.get(f"/tasks/{task['id']}")

    assert resp.headers["etag"] == f'"{task["id"]}-1"'
    assert resp.json()["version"] == 1


def test_create_returns_location_header(client, category_id):
    resp = client.post("/tasks", json={"title": "x", "due_date": "2026-12-01", "category_id": category_id})
    assert resp.headers["location"] == f"/tasks/{resp.json()['id']}"


def test_each_update_bumps_version(client, make_task):
    task = make_task()
    first = client.patch(f"/tasks/{task['id']}", json={"status": "En Progreso"})
    second = client.patch(f"/tasks/{task['id']}", json={"status": "Completada"})

    assert first.json()["version"] == 2
    assert second.json()["version"] == 3
    assert second.headers["etag"] == f'"{task["id"]}-3"'


def test_patch_with_current_etag_succeeds(client, make_task):
    task = make_task()
    etag = client.get(f"/tasks/{task['id']}").headers["etag"]

    resp = client.patch(f"/tasks/{task['id']}", json={"title": "Nuevo"}, headers={"If-Match": etag})

    assert resp.status_code == 200


def test_patch_with_stale_etag_is_rejected_and_nothing_changes(client, make_task):
    """Escenario real: A y B abren la misma tarea; B guarda primero; A no debe pisarlo."""
    task = make_task(title="Original")
    stale = client.get(f"/tasks/{task['id']}").headers["etag"]
    client.patch(f"/tasks/{task['id']}", json={"title": "Cambio de B"})

    resp = client.patch(f"/tasks/{task['id']}", json={"title": "Cambio de A"}, headers={"If-Match": stale})

    assert resp.status_code == 412
    assert "modificada por otra persona" in resp.json()["detail"]
    assert client.get(f"/tasks/{task['id']}").json()["title"] == "Cambio de B"


def test_weak_etag_and_wildcard_are_accepted(client, make_task):
    task = make_task()
    etag = client.get(f"/tasks/{task['id']}").headers["etag"]

    assert (
        client.patch(f"/tasks/{task['id']}", json={"title": "a"}, headers={"If-Match": f"W/{etag}"}).status_code == 200
    )
    assert client.patch(f"/tasks/{task['id']}", json={"title": "b"}, headers={"If-Match": "*"}).status_code == 200


def test_delete_with_stale_etag_is_rejected(client, make_task):
    task = make_task()
    stale = client.get(f"/tasks/{task['id']}").headers["etag"]
    client.patch(f"/tasks/{task['id']}", json={"status": "Completada"})

    assert client.delete(f"/tasks/{task['id']}", headers={"If-Match": stale}).status_code == 412
    assert client.get(f"/tasks/{task['id']}").status_code == 200


def test_race_between_read_and_write_is_detected_by_version_column(client, make_task):
    """Sin If-Match, la columna version igual detecta dos escrituras sobre la misma lectura."""
    task = make_task()
    engine = client.app.state.engine
    with Session(engine) as a, Session(engine) as b:
        task_a = a.get(Task, task["id"])
        task_b = b.get(Task, task["id"])
        task_b.title = "B"
        b.commit()
        task_a.title = "A"
        try:
            a.commit()
            raised = False
        except Exception as exc:  # StaleDataError
            raised = type(exc).__name__ == "StaleDataError"
    assert raised
