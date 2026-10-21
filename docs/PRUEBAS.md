# FlowTask — Estrategia y plan de pruebas

## 1. Objetivo

Demostrar con evidencia automatizada que se cumplen los 5 casos de evaluación del PDF y que
las reglas de negocio, la seguridad y las migraciones no se rompen con cada cambio.

## 2. Niveles de prueba

| Nivel | Qué valida | Herramienta | Dónde corre |
|---|---|---|---|
| Estático | Estilo, bugs comunes, reglas de seguridad (`bandit` vía ruff), tipos | `ruff`, `mypy --strict`, `tsc` | Local, CI |
| Integración de la API | Endpoints reales contra una base real, sin mocks de la capa de datos | `pytest` + `TestClient` | Local, CI |
| Migraciones | Que el esquema migrado sea igual a los modelos y reversible | `pytest` + Alembic | Local, CI |
| Seguridad | CORS, cabeceras, `Host`, rate limit, errores sin internos, guardas de producción | `pytest` | Local, CI |
| Humo de punta a punta | El stack Docker levanta y cumple los 5 casos a través de Nginx | `docker compose` + `curl` | CI |
| Manual exploratoria | Flujos de la interfaz (ver §6) | Navegador | Antes de cada entrega |

> **Por qué sin mocks:** `create_app(settings)` levanta la app completa y migrada en cada
> prueba. Si el SQL está mal, la prueba falla ([ADR-020](adr/020-calidad-automatizada.md)).

## 3. Entorno

| Variable | Efecto |
|---|---|
| *(ninguna)* | SQLite en memoria: rápido y aislado, no toca tu base |
| `TEST_DATABASE_URL=postgresql+psycopg://…/flowtask_test` | Las mismas pruebas contra PostgreSQL real. **La base se borra en cada prueba**: usa una desechable |

```bash
cd backend
pytest                       # 73 pruebas + cobertura (falla si baja de 90 %)
pytest tests/test_tasks.py   # un archivo
pytest -k concurrency        # por nombre
```

## 4. Suite actual

**73 pruebas** (55 funciones, varias parametrizadas) · todas pasan en **SQLite y PostgreSQL** · **cobertura 98 %** · mínimo exigido 90 %.

| Archivo | Pruebas | Cubre |
|---|---|---|
| `test_tasks.py` | 23 funciones | Casos 2–5: creación, validación, filtros, búsqueda, paginación, orden, resumen, PATCH, DELETE, 404 |
| `test_categories.py` | 2 | Caso 1: seed con ≥ 3 categorías e idempotente |
| `test_concurrency.py` | 8 | ETag, `Location`, versión, `If-Match` vigente/obsoleto/débil/`*`, carrera sin `If-Match` |
| `test_migrations.py` | 3 | Esquema = modelos, `downgrade` + `upgrade`, adopción de base previa |
| `test_sqlite_file.py` | 2 | SQLite en archivo (modo por defecto): FK, WAL, `busy_timeout` y 20 escrituras simultáneas sin bloqueo |
| `test_security.py` | 17 | CORS (lista exacta, comodín local solo en desarrollo, validación de orígenes), cabeceras, request-id, `Host`, 429, 500 genérico, health, docs en producción, guardas, logs JSON |

## 5. Matriz de trazabilidad: PDF → prueba

| Criterio del PDF | Prueba(s) |
|---|---|
| **C1.1–1.2** Entidades y relación 1:N | `test_migrations_match_models`, `test_list_tasks_includes_readable_category_name` |
| **C1.3** Seed con ≥ 3 categorías | `test_seed_creates_at_least_three_default_categories`, `test_seed_is_idempotent` |
| **C1.4** `GET /categories` en JSON | `test_seed_creates_at_least_three_default_categories` |
| **C2.1** `POST /tasks` con sus campos y estado por defecto | `test_create_task_returns_201_with_id_and_defaults`, `test_create_task_requires_title_due_date_and_category`, `test_title_is_trimmed_and_blank_description_becomes_null` |
| **C2.2** Categoría inexistente → 404/422 claro | `test_create_task_with_unknown_category_fails_with_clear_message` |
| **C2.3** Estado inválido → 422 Pydantic | `test_create_task_with_invalid_status_is_rejected_by_pydantic` (parametrizada) |
| **C2.4** `201` + objeto con `id` | `test_create_task_returns_201_with_id_and_defaults`, `test_create_returns_location_header` |
| **C3.1** Título, nombre de categoría, fecha, estado | `test_list_tasks_includes_readable_category_name` |
| **C3.3** Filtro consultando el backend | `test_filter_by_status`, `test_filter_by_category`, `test_invalid_status_filter_returns_422` |
| **C4.1** Completar vía PATCH | `test_patch_marks_task_completed_and_sets_completed_at`, `test_reopening_a_task_clears_completed_at` |
| **C4.2** DELETE | `test_delete_task_returns_204_and_task_is_gone` |
| **C5.1** `GET /tasks/99999` → 404 | `test_unknown_task_returns_404_with_standard_body` (GET, PATCH, DELETE) |
| **C5.2** Sin 500 no controlados | `test_non_numeric_id_is_validation_error_not_500`, `test_unexpected_error_returns_generic_500_without_internals` |
| **Stack** SQLite o PostgreSQL | Toda la suite en ambos motores; `test_sqlite_file.py`; `test_search_ignores_case_of_accented_letters_on_every_engine` |
| **Extra** Paginación `limit`/`offset` | `test_pagination_with_limit_offset_and_total_header` |
| **Arquitectura** CORS estricto | `test_cors_allows_configured_frontend_origin`, `test_cors_rejects_unknown_origin`, `test_cors_exposes_pagination_and_etag_headers`, `test_cors_in_development_accepts_any_localhost_port_but_nothing_else`, `test_cors_outside_development_is_exact_list_only`, `test_cors_origins_are_normalized`, `test_invalid_cors_origin_fails_at_startup` |

Los criterios de interfaz (C3.2 dropdown, C3.4 servicio, C3.5 interfaces, C4.3 confirmación,
C4.4 sin recargar) se verifican con `tsc` en modo estricto y con las pruebas manuales de §6.

## 6. Pruebas manuales de la interfaz

Con la app en `http://localhost:5180` (o `:8080` en Docker):

| # | Paso | Resultado esperado |
|---|---|---|
| M1 | Abrir la app | Se ven las categorías con sus contadores y las tareas agrupadas |
| M2 | Elegir "Pendiente" en el dropdown **Estado** | La red muestra `GET /tasks?status=Pendiente`; solo quedan pendientes; el control se marca en cian |
| M3 | Clic en una categoría del sidebar | `GET /tasks?category_id=N`; el título cambia al nombre de la categoría |
| M4 | Clic en el disco de una tarea | Pasa a *Completadas* al instante y aparece el aviso "Tarea marcada como completada." |
| M5 | Clic en el ícono de eliminar → Cancelar | No se borra nada |
| M6 | Eliminar → Confirmar | La tarea desaparece sin recargar; aviso "Tarea eliminada." |
| M7 | "Nueva tarea" con el título vacío | Error bajo el campo; no se envía nada |
| M8 | Escribir en la captura rápida + Enter | Se crea en la categoría visible con fecha de hoy |
| M9 | Apagar el backend y pulsar ↻ | Bloque de error con "Reintentar" y LED rojo; ningún pantallazo en blanco |
| M10 | Teclas `N` y `Ctrl K` | Abre "Nueva tarea" y enfoca el buscador |
| M11 | Ventana de menos de 900 px | El sidebar pasa arriba y nada se desborda |

## 7. Criterios de salida

Una versión se puede entregar cuando:

- [x] `ruff check`, `ruff format --check`, `mypy .` y `npm run build` pasan sin errores.
- [x] `pytest` pasa en SQLite **y** PostgreSQL, con cobertura ≥ 90 %.
- [x] `docker compose up --build` levanta y los 5 casos pasan vía `http://localhost:8080/api`.
- [ ] Las pruebas manuales M1–M11 se revisaron en el navegador (pendiente antes de entregar).

## 8. Fuera del plan (deuda conocida)

- **Pruebas automatizadas del frontend** (Vitest + Testing Library) y **E2E de interfaz**
  (Playwright): el PDF solo pide pruebas de backend. Sería lo primero que agregaría si el
  módulo creciera.
- **Pruebas de carga:** no se definió un SLA. El límite de 120 peticiones/min por IP acota el abuso.
