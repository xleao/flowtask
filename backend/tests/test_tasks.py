"""Casos 2, 3, 4 y 5 de la prueba técnica, más reglas de borde."""

import pytest

# --- Caso 2: registro y validación ------------------------------------------


def test_create_task_returns_201_with_id_and_defaults(client, category_id):
    resp = client.post("/tasks", json={"title": "Informe", "due_date": "2026-11-15", "category_id": category_id})

    assert resp.status_code == 201
    body = resp.json()
    assert isinstance(body["id"], int)
    assert body["status"] == "Pendiente"
    assert body["description"] is None
    assert body["category"]["id"] == category_id
    assert body["completed_at"] is None


def test_create_task_with_unknown_category_fails_with_clear_message(client):
    resp = client.post("/tasks", json={"title": "X", "due_date": "2026-11-15", "category_id": 9999})

    assert resp.status_code == 422
    assert resp.json() == {"detail": "La categoría con id 9999 no existe"}


@pytest.mark.parametrize("status", ["Hecho", "pendiente", "", "Cancelada"])
def test_create_task_with_invalid_status_is_rejected_by_pydantic(client, category_id, status):
    resp = client.post(
        "/tasks", json={"title": "X", "status": status, "due_date": "2026-11-15", "category_id": category_id}
    )

    assert resp.status_code == 422
    assert resp.json()["detail"][0]["loc"] == ["body", "status"]


@pytest.mark.parametrize(
    "payload_override, bad_field",
    [
        ({"title": ""}, "title"),
        ({"title": "   "}, "title"),  # solo espacios = vacío
        ({"title": "a" * 121}, "title"),
        ({"due_date": "31/12/2026"}, "due_date"),
        ({"due_date": "2026-02-30"}, "due_date"),
        ({"due_date": "2099-01-01"}, "due_date"),  # typo de año
        ({"category_id": 0}, "category_id"),
    ],
)
def test_create_task_validates_fields(client, category_id, payload_override, bad_field):
    payload = {"title": "Válida", "due_date": "2026-11-15", "category_id": category_id} | payload_override
    resp = client.post("/tasks", json=payload)

    assert resp.status_code == 422
    assert resp.json()["detail"][0]["loc"][-1] == bad_field


def test_create_task_requires_title_due_date_and_category(client):
    resp = client.post("/tasks", json={})

    assert resp.status_code == 422
    missing = {err["loc"][-1] for err in resp.json()["detail"]}
    assert missing == {"title", "due_date", "category_id"}


def test_title_is_trimmed_and_blank_description_becomes_null(make_task):
    task = make_task(title="  Llamar al cliente  ", description="   ")

    assert task["title"] == "Llamar al cliente"
    assert task["description"] is None


# --- Caso 3: listado y filtros -------------------------------------------------


def test_list_tasks_includes_readable_category_name(client, make_task):
    make_task(title="A")
    tasks = client.get("/tasks").json()

    assert tasks[0]["category"]["name"] in {"Trabajo", "Personal", "Urgente", "Proyectos"}


def test_filter_by_status(client, make_task):
    make_task(title="p1")
    make_task(title="p2")
    make_task(title="c1", status="Completada")

    resp = client.get("/tasks", params={"status": "Pendiente"})

    assert resp.status_code == 200
    assert [t["title"] for t in resp.json()] == ["p1", "p2"]
    assert resp.headers["X-Total-Count"] == "2"


def test_filter_by_category(client, make_task):
    cats = client.get("/categories").json()
    make_task(title="trabajo", category_id=cats[0]["id"])
    make_task(title="otra", category_id=cats[1]["id"])

    resp = client.get("/tasks", params={"category_id": cats[1]["id"]})

    assert [t["title"] for t in resp.json()] == ["otra"]


def test_search_matches_title_or_description_case_insensitive(client, make_task):
    make_task(title="Liquidación de aduanas")
    make_task(title="Otra", description="revisar ADUANAS del lunes")
    make_task(title="Nada que ver")

    resp = client.get("/tasks", params={"q": "aduanas"})

    assert sorted(t["title"] for t in resp.json()) == ["Liquidación de aduanas", "Otra"]
    assert resp.headers["X-Total-Count"] == "2"


def test_search_ignores_case_of_accented_letters_on_every_engine(client, make_task):
    # SQLite solo pliega mayúsculas ASCII de fábrica; database.py lo iguala a PostgreSQL.
    make_task(title="ÁREA de importaciones")
    make_task(title="Revisión de pedidos")

    assert [t["title"] for t in client.get("/tasks", params={"q": "área"}).json()] == ["ÁREA de importaciones"]
    assert [t["title"] for t in client.get("/tasks", params={"q": "REVISIÓN"}).json()] == ["Revisión de pedidos"]


def test_search_treats_wildcards_literally(client, make_task):
    make_task(title="Avance 100%")
    make_task(title="Avance 1000")

    assert [t["title"] for t in client.get("/tasks", params={"q": "100%"}).json()] == ["Avance 100%"]


def test_invalid_status_filter_returns_422(client):
    assert client.get("/tasks", params={"status": "Archivada"}).status_code == 422


def test_pagination_with_limit_offset_and_total_header(client, make_task):
    for i in range(5):
        make_task(title=f"t{i}", due_date=f"2026-12-0{i + 1}")

    resp = client.get("/tasks", params={"limit": 2, "offset": 2})

    assert [t["title"] for t in resp.json()] == ["t2", "t3"]
    assert resp.headers["X-Total-Count"] == "5"


def test_list_is_ordered_by_due_date(client, make_task):
    make_task(title="después", due_date="2026-12-20")
    make_task(title="antes", due_date="2026-11-01")

    assert [t["title"] for t in client.get("/tasks").json()] == ["antes", "después"]


def test_summary_counts_status_overdue_today_and_categories(client, make_task):
    cats = client.get("/categories").json()
    make_task(title="vencida", due_date="2026-10-01", category_id=cats[0]["id"])
    make_task(title="hoy", due_date="2026-10-21", category_id=cats[0]["id"], status="En Progreso")
    make_task(title="completada vencida", due_date="2026-10-01", status="Completada", category_id=cats[1]["id"])

    body = client.get("/tasks/summary", params={"today": "2026-10-21"}).json()

    assert body["total"] == 3
    assert body["by_status"] == {"Pendiente": 1, "En Progreso": 1, "Completada": 1}
    assert body["overdue"] == 1  # la completada no cuenta como vencida
    assert body["due_today"] == 1
    assert body["by_category"] == {str(cats[0]["id"]): 2, str(cats[1]["id"]): 1}

    scoped = client.get("/tasks/summary", params={"today": "2026-10-21", "category_id": cats[1]["id"]}).json()
    assert scoped["by_status"]["Completada"] == 1 and scoped["total"] == 1


# --- Caso 4: cambio de estado y borrado ---------------------------------------


def test_patch_marks_task_completed_and_sets_completed_at(client, make_task):
    task = make_task()

    resp = client.patch(f"/tasks/{task['id']}", json={"status": "Completada"})

    assert resp.status_code == 200
    assert resp.json()["status"] == "Completada"
    assert resp.json()["completed_at"] is not None
    assert resp.json()["title"] == task["title"]  # PATCH parcial: lo demás intacto


def test_reopening_a_task_clears_completed_at(client, make_task):
    task = make_task(status="Completada")

    resp = client.patch(f"/tasks/{task['id']}", json={"status": "Pendiente"})

    assert resp.json()["completed_at"] is None


def test_patch_can_move_task_to_another_category(client, make_task):
    cats = client.get("/categories").json()
    task = make_task(category_id=cats[0]["id"])

    resp = client.patch(f"/tasks/{task['id']}", json={"category_id": cats[1]["id"]})

    assert resp.json()["category"]["name"] == cats[1]["name"]


@pytest.mark.parametrize("payload", [{}, {"title": None}, {"status": "Hecha"}, {"category_id": 9999}])
def test_patch_rejects_invalid_payloads(client, make_task, payload):
    task = make_task()

    assert client.patch(f"/tasks/{task['id']}", json=payload).status_code == 422


def test_delete_task_returns_204_and_task_is_gone(client, make_task):
    task = make_task()

    assert client.delete(f"/tasks/{task['id']}").status_code == 204
    assert client.get(f"/tasks/{task['id']}").status_code == 404


# --- Caso 5: recursos inexistentes ---------------------------------------------


@pytest.mark.parametrize(
    "method, kwargs",
    [("get", {}), ("patch", {"json": {"status": "Completada"}}), ("delete", {})],
)
def test_unknown_task_returns_404_with_standard_body(client, method, kwargs):
    resp = getattr(client, method)("/tasks/99999", **kwargs)

    assert resp.status_code == 404
    assert resp.json() == {"detail": "Tarea no encontrada"}


def test_non_numeric_id_is_validation_error_not_500(client):
    assert client.get("/tasks/abc").status_code == 422
