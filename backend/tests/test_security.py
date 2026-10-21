"""Controles transversales: CORS, cabeceras, Host, rate limit, errores, config y logs."""

import json
import logging

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.logging import JsonFormatter, request_id_ctx
from main import create_app
from tests.conftest import fresh_app, make_settings

FAKE_PG = "postgresql+psycopg://u:p@localhost:1/none"  # nunca se conecta: init_db apagado


def test_cors_allows_configured_frontend_origin(client):
    resp = client.options(
        "/tasks",
        headers={
            "Origin": "http://localhost:5180",
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "content-type,if-match",
        },
    )
    assert resp.status_code == 200
    assert resp.headers["access-control-allow-origin"] == "http://localhost:5180"


def test_cors_exposes_pagination_and_etag_headers(client):
    resp = client.get("/tasks", headers={"Origin": "http://localhost:5180"})
    exposed = resp.headers["access-control-expose-headers"]
    assert "X-Total-Count" in exposed and "ETag" in exposed


def test_cors_rejects_unknown_origin(client):
    resp = client.get("/categories", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in resp.headers


def test_cors_in_development_accepts_any_localhost_port_but_nothing_else():
    with TestClient(fresh_app(environment="development")) as c:
        for origin in ("http://localhost:4200", "http://127.0.0.1:3000", "http://localhost:5173"):
            resp = c.get("/categories", headers={"Origin": origin})
            assert resp.headers["access-control-allow-origin"] == origin
        for origin in ("http://localhost.evil.example", "https://evil.example", "http://192.168.1.5:5180"):
            resp = c.get("/categories", headers={"Origin": origin})
            assert "access-control-allow-origin" not in resp.headers


def test_cors_outside_development_is_exact_list_only(client):
    # `client` usa environment="test": se comporta como producción (sin comodín de puertos).
    resp = client.get("/categories", headers={"Origin": "http://localhost:4200"})
    assert "access-control-allow-origin" not in resp.headers


def test_cors_origins_are_normalized():
    settings = make_settings(cors_origins=" http://localhost:5180/ , https://app.example.com ")
    assert settings.cors_origin_list == ["http://localhost:5180", "https://app.example.com"]


@pytest.mark.parametrize("bad", ["localhost:5180", "http://localhost:5180/app", "ftp://files.example"])
def test_invalid_cors_origin_fails_at_startup(bad):
    with pytest.raises(ValidationError, match="CORS_ORIGINS"):
        make_settings(cors_origins=bad)


def test_security_headers_present(client):
    headers = client.get("/categories").headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
    assert "default-src 'none'" in headers["content-security-policy"]
    assert headers["cache-control"] == "no-store"
    assert len(headers["x-request-id"]) >= 8


def test_safe_incoming_request_id_is_echoed_and_unsafe_one_replaced(client):
    assert (
        client.get("/categories", headers={"X-Request-ID": "abc12345-trace"}).headers["x-request-id"]
        == "abc12345-trace"
    )
    replaced = client.get("/categories", headers={"X-Request-ID": "x\nFAKE LOG LINE"}).headers["x-request-id"]
    assert "\n" not in replaced and "FAKE" not in replaced


def test_untrusted_host_header_is_rejected(client):
    assert client.get("/categories", headers={"Host": "attacker.example"}).status_code == 400


def test_rate_limit_returns_429_with_retry_after():
    with TestClient(fresh_app(rate_limit_enabled=True, rate_limit="3/minute")) as c:
        responses = [c.get("/categories") for _ in range(4)]
    assert [r.status_code for r in responses] == [200, 200, 200, 429]
    assert responses[-1].headers["retry-after"] == "60"


def test_unexpected_error_returns_generic_500_without_internals(client, monkeypatch):
    from app.services import TaskService

    def boom(*_a, **_kw):
        raise RuntimeError("secreto interno: password=123")

    monkeypatch.setattr(TaskService, "list_tasks", boom)
    resp = TestClient(client.app, raise_server_exceptions=False).get("/tasks")

    assert resp.status_code == 500
    assert "secreto" not in resp.text
    assert resp.json()["detail"] == "Error interno del servidor."
    assert resp.json()["request_id"]


def test_health_reports_database_and_schema_revision(client):
    assert client.get("/health/live").json() == {"status": "ok"}
    body = client.get("/health").json()
    assert body["database"] == "ok"
    assert body["schema"] == "0002"


def test_health_returns_503_when_database_is_down():
    app = create_app(make_settings(database_url=FAKE_PG, init_db_on_startup=False))
    with TestClient(app) as c:
        assert c.get("/health").status_code == 503


def test_docs_disabled_in_production():
    app = create_app(make_settings(environment="production", database_url=FAKE_PG, init_db_on_startup=False))
    with TestClient(app) as c:
        assert c.get("/docs").status_code == 404
        assert c.get("/openapi.json").status_code == 404


@pytest.mark.parametrize(
    "overrides",
    [
        {"allowed_hosts": "*"},
        {"cors_origins": "*"},
        {"database_url": "sqlite:///./prod.db"},
    ],
)
def test_production_refuses_permissive_config(overrides):
    with pytest.raises(ValidationError):
        make_settings(
            **({"environment": "production", "database_url": FAKE_PG, "allowed_hosts": "api.example.com"} | overrides)
        )


def test_json_log_line_carries_request_id_and_extras():
    token = request_id_ctx.set("req-123")
    try:
        record = logging.makeLogRecord(
            {"name": "flowtask.access", "levelname": "INFO", "msg": "GET /tasks 200", "status": 200}
        )
        line = json.loads(JsonFormatter().format(record))
    finally:
        request_id_ctx.reset(token)

    assert line["request_id"] == "req-123"
    assert line["msg"] == "GET /tasks 200"
    assert line["status"] == 200
