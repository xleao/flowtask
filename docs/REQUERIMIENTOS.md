# FlowTask — Especificación de requerimientos

> Módulo interno ligero para que pequeños equipos clasifiquen sus actividades por
> área o proyecto (**Categorías**) y gestionen el ciclo de vida de cada actividad (**Tareas**).
>
> Relacionados: [plan de pruebas y trazabilidad](PRUEBAS.md) · [decisiones (ADR)](adr/README.md) · [glosario](GLOSARIO.md)

## 1. Actores

| Actor | Descripción |
|---|---|
| **Administrador del sistema** | Despliega la aplicación; necesita que las categorías base existan desde el primer arranque. |
| **Usuario / colaborador** | Registra, filtra, completa y elimina tareas desde el tablero. |
| **Cliente de la API** | Frontend u otro sistema que consume la API REST y necesita errores estandarizados. |

## 2. Requerimientos funcionales

| ID | Requerimiento | Caso PDF | Implementación |
|---|---|---|---|
| RF-01 | El sistema crea al iniciar al menos 3 categorías base (Trabajo, Personal, Urgente) sin duplicarlas. | 1 | `seed.py`, `CategoryService.seed_defaults` |
| RF-02 | Listar categorías en JSON. | 1 | `GET /categories` |
| RF-03 | Registrar una tarea con título, descripción, estado, fecha límite y categoría. | 2 | `POST /tasks` → `201` |
| RF-04 | Listar tareas mostrando título, categoría (nombre), fecha límite y estado. | 3 | `GET /tasks`, `TaskCard` |
| RF-05 | Filtrar tareas por estado con un dropdown (Todos / Pendiente / En Progreso / Completada) consultando al backend. | 3 | `GET /tasks?status=…`, `<select>` en `FilterBar` |
| RF-06 | Filtrar tareas por categoría. | 3 | `GET /tasks?category_id=…` |
| RF-07 | Marcar una tarea como Completada (o reabrirla) con un solo clic. | 4 | `PATCH /tasks/{id}`, botón check |
| RF-08 | Eliminar una tarea previa confirmación del usuario. | 4 | `DELETE /tasks/{id}` → `204`, `ConfirmDialog` |
| RF-09 | Reflejar cambios en la UI sin recargar la página. | 4 | Actualización optimista en `useTasks` |
| RF-10 | Consultar una tarea por id; si no existe, `404 {"detail": "Tarea no encontrada"}`. | 5 | `GET /tasks/{id}` |
| RF-11 | Paginar el listado de tareas (`limit` / `offset`). | Extra | `X-Total-Count` + `Pagination` |
| RF-12 | Editar una tarea existente (actualización parcial). | — | `PATCH /tasks/{id}`, `TaskForm` modo edición |
| RF-13 | Ver de un vistazo qué atender primero: tareas agrupadas en *Para hoy y vencidas*, *Próximos días* y *Completadas*, con conteos por estado (para hoy, abiertas, completadas) y por categoría. | — | `GET /tasks/summary`, `TaskList`, `FilterBar`, `Sidebar` |
| RF-14 | Cambiar el estado de una tarea a cualquiera de los 3 valores directamente desde la lista. | 4 | Selector de estado en `TaskCard` |
| RF-15 | Buscar tareas por texto en título o descripción (sin distinguir mayúsculas), con `Ctrl/⌘ K`. | — | `GET /tasks?q=…`, `SearchBox` |
| RF-16 | Evitar que una edición pise otra hecha en paralelo: si la tarea cambió desde que se leyó, la operación se rechaza con un mensaje claro. | — | `ETag` / `If-Match` → `412`, columna `version` |
| RF-17 | Captura rápida: escribir un título y pulsar Enter crea la tarea sin abrir el formulario. | — | `QuickCapture` → `POST /tasks` |
| RF-18 | Mostrar u ocultar las tareas completadas sin perder el filtro activo. | — | `FilterBar` (Ver/Ocultar), `TaskList` |
| RF-19 | Atajos de teclado: `N` abre "Nueva tarea" y `Ctrl/⌘ K` enfoca el buscador. | — | `useHotkey`, `SearchBox` |
| RF-20 | Mostrar si la API responde y permitir sincronizar manualmente. | — | LED y botón ↻ en `Sidebar` |
| RF-21 | Elegir entre animaciones completas o modo ligero; en equipos lentos se activa solo y se avisa. | — | `utils/effects.ts`, botón ⚡ en `Sidebar` |

## 3. Reglas de negocio

| ID | Regla | Dónde se hace cumplir |
|---|---|---|
| RN-01 | `title` es obligatorio, no puede ser vacío ni solo espacios; máx. 120 caracteres (se recortan espacios). | Pydantic + `CHECK (length(trim(title)) > 0)` |
| RN-02 | `description` es opcional, máx. 1000 caracteres; un texto en blanco se guarda como `null`. | Pydantic |
| RN-03 | `status` ∈ {`Pendiente`, `En Progreso`, `Completada`}; por defecto `Pendiente`. Otro valor → `422`. | Pydantic (`Enum`) + `CHECK` en la BD |
| RN-04 | `due_date` debe ser una fecha ISO válida (`YYYY-MM-DD`) y no superar 5 años desde hoy (atrapa typos de año). | Pydantic |
| RN-05 | `category_id` debe existir; si no → `422` con mensaje `La categoría con id N no existe`. | `TaskService` + FK en la BD |
| RN-06 | Una categoría tiene muchas tareas (1:N); no se puede borrar una categoría con tareas. | FK `ON DELETE RESTRICT` |
| RN-07 | Los nombres de categoría son únicos sin distinguir mayúsculas. | Índice único sobre `lower(name)` |
| RN-08 | Al pasar a `Completada` se registra `completed_at`; al reabrir se limpia. | `TaskService._sync_completed_at` |
| RN-09 | El listado se ordena por fecha límite ascendente (lo más urgente primero). | `TaskRepository.search` |
| RN-10 | Una tarea no completada cuya fecha ya pasó se muestra como **vencida** (insignia y borde rojos) y va en la sección *Para hoy y vencidas*. | `TaskList`, `TaskCard` (presentación) |
| RN-11 | La captura rápida crea la tarea en la categoría seleccionada (o en la primera si se ve "Todas"), con fecha límite **hoy** y estado `Pendiente`. El placeholder lo indica antes de enviar. | `QuickCapture`, `App.handleQuickCreate` |
| RN-12 | Las tareas de la categoría *Urgente* llevan borde rojo aunque no estén vencidas. | `TaskCard` |
| RN-13 | Al editar se envían solo los campos que cambiaron (`PATCH` parcial); si no cambió nada, no se llama al backend. | `App.diff` |
| RN-14 | Al crear, el selector de fecha sugiere desde hoy; al editar no se limita, para no bloquear tareas ya vencidas. | `TaskForm` |
| RN-15 | Eliminar siempre exige confirmación nombrando la tarea; es la única acción irreversible. | `ConfirmDialog` |

> **Decisión:** no se rechazan fechas límite pasadas. El PDF pide "fecha válida", y
> registrar una tarea atrasada es un caso real; en su lugar la UI la marca como vencida
> y el selector de fecha sugiere desde hoy al crear.

## 4. Requerimientos no funcionales

| ID | Atributo | Requerimiento | Cómo se cumple |
|---|---|---|---|
| RNF-01 | Mantenibilidad | Arquitectura en capas: routers → services → repositories → models. | Estructura de `backend/app/` |
| RNF-02 | Mantenibilidad | Frontend modular: componentes reutilizables; HTTP encapsulado en servicios; tipos estrictos. | `components/`, `services/`, `types/`, `strict: true` |
| RNF-03 | Robustez | Ningún recurso inexistente o dato inválido produce un `500`; errores con formato `{"detail": …}`. | Handlers globales en `app/core/errors.py` |
| RNF-04 | Seguridad | CORS restringido a los orígenes del frontend (validados al arrancar) y a los métodos usados; el comodín de puertos de `localhost` solo existe en desarrollo. | `CORSMiddleware` en `main.py`, `Settings` |
| RNF-05 | Seguridad | Rate limiting por IP (`429`) contra abuso/fuerza bruta. | `slowapi` (API) + `limit_req` (Nginx) |
| RNF-06 | Seguridad | Cabeceras de seguridad (CSP, nosniff, X-Frame-Options, Referrer/Permissions-Policy) y `Cache-Control: no-store`. | `RequestContextMiddleware`, `nginx.conf` |
| RNF-07 | Seguridad | Errores internos nunca exponen stack traces; se registran con `request_id` para trazabilidad. | `errors.py`, `middleware.py` |
| RNF-08 | Seguridad | Validación de `Host`, documentación OpenAPI deshabilitada en producción, contenedores sin root. | `TrustedHostMiddleware`, `Dockerfile` |
| RNF-09 | Integridad | Reglas críticas duplicadas en la base (CHECK, FK, UNIQUE), no solo en la app. | `app/models/` |
| RNF-10 | Rendimiento | Listado sin N+1 (JOIN a categoría), índice `(status, due_date)`, paginación máx. 100. | `TaskRepository`, modelos |
| RNF-11 | Usabilidad | Feedback inmediato (optimista), mensajes amigables si el backend no responde, accesible por teclado (`<dialog>`, `aria-*`), contraste AA y responsive (< 900 px). | Frontend, [DISENO_UI](DISENO_UI.md) |
| RNF-12 | Portabilidad | Funciona igual con SQLite (por defecto, sin instalar nada) y PostgreSQL, cambiando solo `DATABASE_URL`; toda la suite de pruebas corre en ambos. Levantable con `docker compose up`. | `database.py`, `docker-compose.yml`, CI |
| RNF-13 | Calidad | Pruebas automatizadas con pytest + TestClient cubriendo los 5 casos, con cobertura mínima del 90 %. | `backend/tests/` (73 pruebas, 98 %) |
| RNF-14 | Calidad | Lint, tipado estricto y pruebas en SQLite y PostgreSQL en cada push; el stack Docker se valida de punta a punta. | `ruff`, `mypy --strict`, `.github/workflows/ci.yml` |
| RNF-15 | Evolución | El esquema se versiona con migraciones reversibles, probadas contra los modelos. | Alembic, `tests/test_migrations.py` |
| RNF-16 | Observabilidad | Cada request tiene un `request_id` presente en la respuesta y en logs estructurados (JSON en producción); health checks de liveness y readiness. | `app/core/logging.py`, `/health`, `/health/live` |
| RNF-17 | Seguridad | En producción la app no arranca con configuración permisiva (hosts `*`, CORS `*`, SQLite); consultas con `statement_timeout`. | `Settings._production_guardrails` |
| RNF-18 | Rendimiento | Fluida en laptops de gama baja: sin `backdrop-filter`/`blur`, animaciones solo con `transform`, modo ligero automático (≤ 4 núcleos/RAM o < 40 FPS medidos). Bundle: CSS 10.7 KB y JS 57 KB gzip. | `styles.css`, `utils/effects.ts` |
| RNF-19 | Portabilidad | Todo el sistema (PostgreSQL + API + Nginx con la SPA) se levanta con `docker compose up --build`. | `docker-compose.yml`, `Dockerfile`s |

## 5. Casos de aceptación (Gherkin) y trazabilidad a pruebas

```gherkin
Caso 1 — Inicialización
  Dado que la base de datos está vacía
  Cuando se ejecuta `python seed.py` (o arranca la API)
  Entonces existen las categorías Trabajo, Personal y Urgente
  Y GET /categories las devuelve en JSON
  Y ejecutar el seed de nuevo no crea duplicados

Caso 2 — Registro y validación
  Cuando envío POST /tasks con un título y una categoría existente
  Entonces recibo 201 con el objeto creado, su id y status "Pendiente"
  Cuando envío un category_id inexistente
  Entonces recibo 422 con "La categoría con id N no existe"
  Cuando envío status "Hecho"
  Entonces recibo 422 de validación de Pydantic

Caso 3 — Tablero y filtros
  Cuando elijo "Pendiente" en el dropdown de estado
  Entonces el frontend llama GET /tasks?status=Pendiente
  Y solo veo tareas pendientes con el nombre de su categoría

Caso 4 — Transición y borrado
  Cuando hago clic en el disco de una tarea
  Entonces se envía PATCH /tasks/{id} {"status": "Completada"} y la tarjeta cambia al instante
  Cuando elimino una tarea y confirmo en el diálogo
  Entonces se envía DELETE /tasks/{id} y desaparece sin recargar

Caso 5 — Recursos inexistentes
  Cuando consulto GET /tasks/99999
  Entonces recibo 404 {"detail": "Tarea no encontrada"} y nunca un 500
```

| Caso | Pruebas (`backend/tests/`) |
|---|---|
| 1 | `test_seed_creates_at_least_three_default_categories`, `test_seed_is_idempotent` |
| 2 | `test_create_task_returns_201_with_id_and_defaults`, `test_create_task_with_unknown_category_fails_with_clear_message`, `test_create_task_with_invalid_status_is_rejected_by_pydantic`, `test_create_task_validates_fields`, `test_create_task_requires_title_due_date_and_category` |
| 3 | `test_list_tasks_includes_readable_category_name`, `test_filter_by_status`, `test_filter_by_category`, `test_pagination_with_limit_offset_and_total_header` |
| 4 | `test_patch_marks_task_completed_and_sets_completed_at`, `test_reopening_a_task_clears_completed_at`, `test_delete_task_returns_204_and_task_is_gone` |
| 5 | `test_unknown_task_returns_404_with_standard_body`, `test_non_numeric_id_is_validation_error_not_500` |
| RF-15 búsqueda | `test_search_matches_title_or_description_case_insensitive`, `test_search_treats_wildcards_literally` |
| RF-16 concurrencia | `tests/test_concurrency.py` (ETag, versión, `If-Match` vigente/obsoleto/débil/`*`, carrera sin `If-Match`) |
| RNF-15 migraciones | `tests/test_migrations.py` (esquema = modelos, reversibles, adopción de base previa) |
| RNF seguridad / observabilidad | `tests/test_security.py` (CORS, cabeceras, request-id, Host, 429, 500 genérico, health, docs en prod, guardas de producción, logs JSON) |

## 6. Fuera de alcance (decisiones conscientes)

- **Autenticación/usuarios:** el PDF no la pide y sus casos de prueba llaman a los endpoints sin credenciales. Agregarla rompería el contrato evaluado. La arquitectura permite sumarla como una dependencia `Depends(get_current_user)` en los routers sin tocar servicios ni repositorios.
- **CRUD de categorías:** el PDF solo pide `GET /categories`; las categorías se administran por seed.
