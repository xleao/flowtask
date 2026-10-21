# FlowTask — Referencia de la API

API REST JSON. La especificación OpenAPI interactiva se genera sola en `/docs`
(Swagger UI) y `/redoc` cuando `ENVIRONMENT` no es `production`.

| Entorno | URL base |
|---|---|
| Desarrollo local | `http://localhost:8010` |
| Docker Compose (vía Nginx, mismo origen) | `http://localhost:8080/api` |

## Convenciones

| Tema | Regla |
|---|---|
| Formato | JSON UTF-8 en el cuerpo de peticiones y respuestas. `Content-Type: application/json` |
| Fechas | `due_date` en ISO 8601 (`YYYY-MM-DD`). Marcas de tiempo con zona horaria (`2026-10-21T15:41:46-05:00`) |
| Estados | Exactamente `Pendiente`, `En Progreso` o `Completada` (con mayúsculas y espacio) |
| Errores | Siempre `{"detail": ...}`. Ver [Errores](#errores) |
| Paginación | `limit` y `offset` en la query; el total viene en la cabecera `X-Total-Count` |
| Concurrencia | `ETag` en cada tarea; `If-Match` opcional en `PATCH` y `DELETE` |
| Trazabilidad | Cada respuesta trae `X-Request-ID` (se puede enviar uno propio alfanumérico) |
| Autenticación | Ninguna: fuera de alcance según el PDF ([ADR-019](adr/019-fuera-de-alcance.md)) |

## Resumen de endpoints

| Método | Ruta | Descripción | Éxito |
|---|---|---|---|
| `GET` | [`/categories`](#get-categories) | Lista de categorías | `200` |
| `GET` | [`/tasks`](#get-tasks) | Lista filtrada, buscada y paginada | `200` |
| `GET` | [`/tasks/summary`](#get-taskssummary) | Conteos para el tablero | `200` |
| `GET` | [`/tasks/{id}`](#get-tasksid) | Detalle de una tarea | `200` |
| `POST` | [`/tasks`](#post-tasks) | Crear tarea | `201` |
| `PATCH` | [`/tasks/{id}`](#patch-tasksid) | Actualización parcial | `200` |
| `DELETE` | [`/tasks/{id}`](#delete-tasksid) | Eliminar tarea | `204` |
| `GET` | [`/health`](#get-health) | Readiness (base de datos + esquema) | `200` |
| `GET` | [`/health/live`](#get-healthlive) | Liveness (el proceso responde) | `200` |

## Modelos

### Category

| Campo | Tipo | Notas |
|---|---|---|
| `id` | entero | |
| `name` | texto | Único sin distinguir mayúsculas |
| `description` | texto \| null | |

### Task

| Campo | Tipo | Notas |
|---|---|---|
| `id` | entero | |
| `title` | texto | 1–120 caracteres, sin espacios al inicio ni al final |
| `description` | texto \| null | Máx. 1000. Un texto en blanco se guarda como `null` |
| `status` | `TaskStatus` | Por defecto `Pendiente` |
| `due_date` | fecha | ISO, hasta 5 años por delante del año actual |
| `category_id` | entero | Debe existir |
| `category` | `Category` | Embebida: el nombre legible sin otra petición |
| `created_at` | fecha-hora | Asignada por el servidor |
| `updated_at` | fecha-hora | Se actualiza en cada cambio |
| `completed_at` | fecha-hora \| null | Se llena al pasar a `Completada` y se limpia al reabrir |
| `version` | entero | Sube en cada cambio. Es la base del `ETag` |

### TaskSummary

| Campo | Tipo | Notas |
|---|---|---|
| `total` | entero | Tareas que cumplen el filtro de categoría |
| `by_status` | objeto | `{"Pendiente": n, "En Progreso": n, "Completada": n}` |
| `overdue` | entero | No completadas con fecha anterior a `today` |
| `due_today` | entero | No completadas que vencen `today` |
| `by_category` | objeto | `{"<category_id>": n}` sobre todas las tareas |

---

## Endpoints

### `GET /categories`

Lista todas las categorías ordenadas por nombre.

```bash
curl http://localhost:8010/categories
```

```json
[
  {"id": 2, "name": "Personal", "description": "Pendientes personales y del día a día"},
  {"id": 4, "name": "Proyectos", "description": "Iniciativas de mediano plazo por área"},
  {"id": 1, "name": "Trabajo", "description": "Actividades laborales y del equipo"},
  {"id": 3, "name": "Urgente", "description": "Requiere atención inmediata"}
]
```

### `GET /tasks`

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `status` | `TaskStatus` | — | Filtra por estado. Un valor inválido responde `422` |
| `category_id` | entero > 0 | — | Filtra por categoría |
| `q` | texto 1–100 | — | Busca en título y descripción, sin distinguir mayúsculas. `%` y `_` se tratan literalmente |
| `limit` | 1–100 | `50` | Tamaño de página |
| `offset` | ≥ 0 | `0` | Desplazamiento |

Orden: fecha límite ascendente y luego `id` (lo más urgente primero, orden estable entre páginas). Cabecera de respuesta: `X-Total-Count`.

```bash
curl -i "http://localhost:8010/tasks?status=Pendiente&category_id=1&limit=10&offset=0"
```

```http
HTTP/1.1 200 OK
X-Total-Count: 23
Content-Type: application/json

[{"id": 11, "title": "Actualizar contactos de agentes de carga", "status": "Pendiente", "due_date": "2026-10-18", "category": {"id": 1, "name": "Trabajo", ...}, ...}]
```

### `GET /tasks/summary`

| Parámetro | Tipo | Descripción |
|---|---|---|
| `category_id` | entero > 0 | Acota `total`, `by_status`, `overdue` y `due_today` a una categoría |
| `today` | fecha | Fecha de referencia del cliente (su zona horaria). Por defecto, la del servidor |

```json
{"total": 12, "by_status": {"Pendiente": 6, "En Progreso": 2, "Completada": 4}, "overdue": 1, "due_today": 2, "by_category": {"1": 5, "2": 2, "3": 3, "4": 2}}
```

### `GET /tasks/{id}`

Responde `200` con la tarea y la cabecera `ETag: "<id>-<version>"`.

```bash
curl -i http://localhost:8010/tasks/99999
```

```http
HTTP/1.1 404 Not Found

{"detail": "Tarea no encontrada"}
```

Un `id` no numérico (`/tasks/abc`) responde `422`, nunca `500`.

### `POST /tasks`

| Campo | Obligatorio | Regla |
|---|---|---|
| `title` | Sí | 1–120 caracteres tras quitar espacios |
| `description` | No | Máx. 1000 caracteres |
| `status` | No | `TaskStatus`; por defecto `Pendiente` |
| `due_date` | Sí | Fecha ISO válida |
| `category_id` | Sí | Entero > 0 de una categoría existente |

```bash
curl -i -X POST http://localhost:8010/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Preparar informe mensual","due_date":"2026-10-30","category_id":1}'
```

```http
HTTP/1.1 201 Created
Location: /tasks/14
ETag: "14-1"

{"id": 14, "title": "Preparar informe mensual", "description": null, "status": "Pendiente", "due_date": "2026-10-30", "category_id": 1, "category": {"id": 1, "name": "Trabajo", ...}, "completed_at": null, "version": 1, ...}
```

| Caso | Respuesta |
|---|---|
| Categoría inexistente | `422 {"detail": "La categoría con id 9999 no existe"}` |
| `status` fuera del enum | `422` de Pydantic con `loc: ["body","status"]` |
| Título vacío o solo espacios | `422` (`string_too_short`) |
| Fecha inválida (`2026-13-45`) | `422` |

### `PATCH /tasks/{id}`

Actualización parcial: solo cambian los campos enviados. Exige al menos un campo;
`title`, `status`, `due_date` y `category_id` no aceptan `null` (`description` sí, para borrarla).

```bash
curl -X PATCH http://localhost:8010/tasks/14 \
  -H "Content-Type: application/json" \
  -H 'If-Match: "14-1"' \
  -d '{"status":"Completada"}'
```

| Caso | Respuesta |
|---|---|
| Correcto | `200` con la tarea y su nuevo `ETag` |
| No existe | `404 {"detail": "Tarea no encontrada"}` |
| `If-Match` desactualizado | `412` y nada se modifica |
| Otra escritura ganó la carrera (sin `If-Match`) | `409` |
| Cuerpo vacío, `null` inválido o categoría inexistente | `422` |

`If-Match` acepta ETags débiles (`W/"14-1"`) y `*`.

### `DELETE /tasks/{id}`

`204` sin cuerpo. `404` si no existe; `412` si se envía un `If-Match` desactualizado.

### `GET /health`

```json
{"status": "ok", "database": "ok", "schema": "0002", "version": "1.1.0"}
```

`503` (con `Retry-After`) si la base de datos no responde. Lo usa el healthcheck de Docker.

### `GET /health/live`

`200` mientras el proceso responda. No consulta la base.

---

## Errores

Toda respuesta de error tiene `detail`. Si es texto, se puede mostrar al usuario tal cual.
Si es una lista, viene de Pydantic e indica el campo en `loc`.

| Código | Cuándo | Ejemplo de `detail` |
|---|---|---|
| `400` | Cabecera `Host` no permitida | `Invalid host header` |
| `404` | Recurso inexistente | `Tarea no encontrada` |
| `409` | Edición concurrente o violación de integridad | `La operación viola una restricción de integridad de datos.` |
| `412` | `If-Match` desactualizado | `La tarea fue modificada por otra persona mientras la editabas. Recarga para ver la versión actual.` |
| `422` | Validación (Pydantic) o regla de negocio | `La categoría con id 9999 no existe` |
| `429` | Límite de peticiones (120/min por IP). Trae `Retry-After` | — |
| `500` | Error inesperado. Nunca expone internos | `Error interno del servidor.` + `request_id` |
| `503` | Base de datos no disponible. Trae `Retry-After` | `Base de datos no disponible. Intenta nuevamente en unos segundos.` |

Ejemplo de error de validación:

```json
{"detail": [{"type": "string_too_short", "loc": ["body", "title"], "msg": "String should have at least 1 character", "input": ""}]}
```

## Cabeceras

| Cabecera | Dirección | Uso |
|---|---|---|
| `X-Total-Count` | Respuesta | Total de resultados de `GET /tasks` (expuesta por CORS) |
| `ETag` | Respuesta | Versión de la tarea: `"<id>-<version>"` |
| `Location` | Respuesta | URL de la tarea creada |
| `If-Match` | Petición | Precondición opcional en `PATCH`/`DELETE` |
| `X-Request-ID` | Ambas | Correlación con los logs |
| `Retry-After` | Respuesta | En `429` y `503` |

CORS (en Docker no aplica: es mismo origen). Orígenes: la lista exacta de `CORS_ORIGINS`
(por defecto `http://localhost:5180` y `http://127.0.0.1:5180`) y, **solo en `development`**,
`localhost`/`127.0.0.1` en cualquier puerto. Preflight en caché 10 minutos; métodos `GET, POST, PATCH, DELETE, OPTIONS`; cabeceras `Content-Type`,
`X-Request-ID` e `If-Match`; expuestas `X-Total-Count`, `X-Request-ID`, `ETag` y `Location`;
sin credenciales.
