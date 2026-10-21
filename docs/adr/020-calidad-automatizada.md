# ADR-020: Calidad automatizada: app factory, pruebas contra base real y CI

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El PDF pide al menos 4 pruebas con pytest y TestClient. Se buscó que las pruebas validen la app real.

## Decisión

`create_app(settings)` permite levantar la app completa y migrada en cada prueba, **sin mocks de la capa de datos**, contra SQLite en memoria o PostgreSQL real. Hay 73 pruebas, 98 % de cobertura (mínimo exigido 90 %), `ruff` y `mypy --strict`. El CI corre todo en Python 3.10 y 3.12 contra ambos motores, compila el frontend y levanta `docker compose` probando los 5 casos.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Mockear repositorios | Las pruebas pasan aunque el SQL esté mal. |

## Consecuencias

- ✅ Cada caso del PDF tiene pruebas que lo demuestran.
- ✅ Una regresión rompe el CI antes de llegar a `main`.
- ⚠️ Las pruebas contra PostgreSQL necesitan una base desechable.

## Referencias

`backend/tests/`, `backend/pyproject.toml`, `.github/workflows/ci.yml`
