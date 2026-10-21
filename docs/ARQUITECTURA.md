# FlowTask — Arquitectura

Modelo C4 (Contexto → Contenedores → Componentes → Código → Despliegue), modelo
de datos, flujos principales y contrato de la API. Los diagramas son Mermaid (GitHub
los renderiza). El diseño visual y la UX están en [DISENO_UI.md](DISENO_UI.md); los
requerimientos y las reglas de negocio, en [REQUERIMIENTOS.md](REQUERIMIENTOS.md). El
porqué de cada decisión está en los [ADR](adr/README.md); el contrato detallado, en [API.md](API.md).

## C4 · Nivel 1 — Contexto

```mermaid
flowchart TB
    user["👤 Colaborador<br/><i>Persona</i><br/>Organiza sus actividades por categoría"]
    admin["👤 Administrador<br/><i>Persona</i><br/>Despliega y siembra el sistema"]
    flowtask["<b>FlowTask</b><br/><i>Sistema de software</i><br/>Gestión de tareas por categoría para pequeños equipos"]

    user -- "Crea, filtra, completa y elimina tareas<br/>[HTTPS]" --> flowtask
    admin -- "Despliega, ejecuta seed.py" --> flowtask

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef system fill:#1168bd,color:#fff,stroke:#0b4884
    class user,admin person
    class flowtask system
```

FlowTask no depende de sistemas externos: es un módulo interno autocontenido.

## C4 · Nivel 2 — Contenedores

```mermaid
flowchart TB
    user["👤 Colaborador"]

    subgraph flowtask["FlowTask"]
        spa["<b>SPA</b><br/><i>React 18 + TypeScript + Vite</i><br/>Tablero, filtros, formularios"]
        web["<b>Servidor web</b><br/><i>Nginx</i><br/>Sirve estáticos, CSP, proxy /api, rate limit"]
        api["<b>API REST</b><br/><i>Python 3.12 · FastAPI · SQLAlchemy 2</i><br/>Reglas de negocio y validación"]
        db[("<b>Base de datos</b><br/><i>PostgreSQL 16</i><br/>categories, tasks")]
    end

    user -- "HTTPS" --> web
    web -- "Entrega HTML/JS/CSS" --> spa
    spa -- "JSON / HTTP<br/>fetch vía TaskService" --> web
    web -- "/api/* → HTTP (red interna)" --> api
    api -- "SQL (psycopg 3, pool)" --> db

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef container fill:#438dd5,color:#fff,stroke:#2e6295
    classDef store fill:#438dd5,color:#fff,stroke:#2e6295
    class user person
    class spa,web,api container
    class db store
```

En desarrollo la SPA corre en Vite (`:5180`) y llama directo a la API (`:8010`) —
por eso CORS es estricto. En `docker compose` todo pasa por Nginx (mismo origen).

## C4 · Nivel 3 — Componentes del backend

```mermaid
flowchart LR
    client["SPA / cliente HTTP"]

    subgraph api["API REST (FastAPI)"]
        direction LR
        mw["<b>Middleware</b><br/>TrustedHost · CORS ·<br/>RequestContext (request-id,<br/>cabeceras, log) · RateLimit"]
        subgraph routers["routers/ — Controladores"]
            rc["categories.py"]
            rt["tasks.py"]
        end
        subgraph services["services/ — Lógica de negocio"]
            sc["CategoryService<br/>(seed idempotente)"]
            st["TaskService<br/>(RN-05, RN-08)"]
        end
        subgraph repos["repositories/ — Acceso a datos"]
            pc["CategoryRepository"]
            pt["TaskRepository<br/>(filtros, paginación)"]
        end
        schemas["schemas/<br/>Pydantic<br/>(RN-01..04)"]
        models["models/<br/>SQLAlchemy"]
        errors["core/errors.py<br/>DomainError → JSON"]
        dbm["database.py<br/>engine · get_db"]
    end
    pg[("PostgreSQL")]

    client --> mw --> routers
    rc --> sc --> pc
    rt --> st --> pt
    st --> pc
    routers -. "valida con" .-> schemas
    pc & pt --> models
    pc & pt --> dbm --> pg
    st -. "lanza" .-> errors
```

**Regla de dependencias:** cada capa solo conoce a la de abajo. Los routers no
tocan SQL; los repositorios no hacen `commit` (lo decide el servicio = unidad de
trabajo); los servicios no conocen HTTP (lanzan `NotFoundError`/`BusinessRuleError`
y un handler global los traduce).

## C4 · Nivel 3 — Componentes del frontend

```mermaid
flowchart TB
    main["<b>main.tsx</b><br/>Fuentes autoalojadas · initEffects()"]
    app["<b>App.tsx</b> (orquestador)<br/>Filtros (estado, categoría, q, página)<br/>y modales; conecta hooks y componentes"]
    hook["<b>hooks/useTasks</b><br/>Lista paginada + resumen,<br/>mutaciones optimistas con rollback,<br/>descarta respuestas obsoletas"]
    act["<b>hooks/useTaskActions</b><br/>Guardar, captura rápida,<br/>cambiar estado, eliminar + avisos"]
    hks["<b>hooks/</b><br/>useCategories · useEffectsMode · useHotkey"]
    subgraph ui["components/"]
        sb["Sidebar<br/>categorías · conexión · ⚡ ↻"]
        tb["Topbar<br/>título · buscador · Nueva tarea"]
        le["LoadError"]
        sx["SearchBox<br/>debounce 300 ms · Ctrl K"]
        fb["FilterBar<br/>KPIs + dropdown de estado"]
        qc["QuickCapture"]
        tl["TaskList<br/>secciones · vacíos · skeleton"]
        tc["TaskCard"]
        tf["TaskForm"]
        cd["ConfirmDialog"]
        md["Modal (&lt;dialog&gt;)"]
        pg["Pagination"]
        ts["Toasts"]
        ic["Icon (SVG inline)"]
    end
    subgraph svc["services/"]
        tsv["TaskService"]
        csv["CategoryService"]
        api["apiClient<br/>timeout 10 s · ApiError · parseo 422"]
    end
    subgraph utils["utils/"]
        dt["dates<br/>fechas relativas"]
        ef["effects<br/>modo ligero"]
        pf["platform<br/>Ctrl vs ⌘"]
    end
    types["types/models.ts<br/>Task · Category · TaskStatus · TaskSummary"]

    main --> app
    app --> hook --> tsv --> api
    app --> act --> hook
    app --> hks --> csv --> api
    app --> sb & tb & fb & qc & tl & le & tf & cd & pg & ts
    tb --> sx
    tl --> tc
    tf & cd --> md
    main & hks -. "usa" .-> ef
    tc & tf -. "usa" .-> dt
    svc -. "tipado con" .-> types
    ui -. "tipado con" .-> types
```

Los componentes son **presentacionales**: reciben props y emiten eventos. El estado
del servidor vive en `useTasks`; lo que hace cada acción del usuario (y su aviso), en
`useTaskActions`; el HTTP, solo en `services/`. `App.tsx` no tiene lógica propia: guarda el
estado de la vista y conecta las piezas. `SearchBox` y
`QuickCapture` guardan su propio texto para que escribir no re-renderice el tablero.
El sistema visual está documentado en [DISENO_UI.md](DISENO_UI.md).

## C4 · Despliegue (Docker Compose)

```mermaid
flowchart LR
    browser["🌐 Navegador"]
    subgraph host["Equipo local (Docker)"]
        subgraph net["red interna de compose"]
            fe["<b>frontend</b><br/>node:22 (build) → nginx:1.27-alpine<br/>SPA compilada + proxy /api<br/>:80"]
            be["<b>backend</b><br/>python:3.12-slim · usuario sin root<br/>seed.py → uvicorn :8010<br/>healthcheck /health"]
            db[("<b>db</b><br/>postgres:16-alpine<br/>volumen pgdata")]
        end
    end
    browser -- "http://localhost:8080" --> fe
    browser -. "http://127.0.0.1:8010/docs<br/>(solo esta máquina)" .-> be
    fe -- "/api/* → http://backend:8010" --> be
    be -- "SQL :5432 (sin publicar)" --> db
```

| Entorno | Frontend | API | Base de datos |
|---|---|---|---|
| Desarrollo local | Vite `http://localhost:5180` (si está ocupado, el siguiente: CORS acepta cualquier puerto de localhost en desarrollo) | `http://localhost:8010` | PostgreSQL local o SQLite |
| Docker Compose | Nginx `http://localhost:8080` (mismo origen, sin CORS) | `http://127.0.0.1:8010` | PostgreSQL 16 en contenedor, sin puerto publicado |

Los puertos evitan a propósito los valores por defecto (5173, 8000, 3000, 4200) para
convivir con otros proyectos en la misma máquina. El orden de arranque lo controlan
los healthchecks: `db` sano → `backend` migra, siembra y responde `/health` → `frontend`.

## C4 · Nivel 4 — Código (modelo de dominio)

```mermaid
classDiagram
    class Category {
        +int id
        +str name
        +str? description
        +list~Task~ tasks
    }
    class Task {
        +int id
        +str title
        +str? description
        +TaskStatus status
        +date due_date
        +int category_id
        +datetime created_at
        +datetime updated_at
        +datetime? completed_at
        +int version
        +str etag
    }
    class TaskStatus {
        <<enumeration>>
        Pendiente
        En Progreso
        Completada
    }
    class TaskService {
        +list_tasks(status, category_id, q, limit, offset)
        +summary(category_id, today) TaskSummary
        +get_task(id) Task
        +create_task(TaskCreate) Task
        +update_task(id, TaskUpdate, if_match) Task
        +delete_task(id, if_match)
        -_ensure_category_exists(id)
        -_sync_completed_at(task)
    }
    class TaskRepository {
        +search(status, category_id, q, limit, offset) tuple
        +count_by_status(category_id, today) tuple
        +count_by_category() dict
        +get(id) Task?
        +add(task)
        +delete(task)
    }
    Category "1" --> "0..*" Task : agrupa
    Task --> TaskStatus
    TaskService --> TaskRepository
    TaskService --> CategoryRepository
    TaskRepository ..> Task
```

## Modelo de datos

```mermaid
erDiagram
    categories ||--o{ tasks : "agrupa"
    categories {
        int id PK
        varchar name "UNIQUE lower(name)"
        varchar description "nullable"
    }
    tasks {
        int id PK
        varchar title "CHECK length(trim(title)) > 0"
        text description "nullable"
        varchar status "CHECK IN (Pendiente, En Progreso, Completada) DEFAULT Pendiente"
        date due_date
        int category_id FK "ON DELETE RESTRICT, indexado"
        timestamptz created_at "DEFAULT now()"
        timestamptz updated_at "DEFAULT now(), ON UPDATE"
        timestamptz completed_at "nullable"
        int version "DEFAULT 1, bloqueo optimista"
    }
```

Índices: `ix_tasks_category_id`, `ix_tasks_status_due_date` (filtro principal del
tablero + orden), `uq_categories_name_lower`. `status` se guarda como `VARCHAR` +
`CHECK` en vez de un `ENUM` nativo de Postgres: agregar un estado nuevo es cambiar
un constraint, no un `ALTER TYPE`, y el mismo esquema funciona en SQLite.

## Flujos principales

### Crear tarea (Caso 2)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant F as TaskForm
    participant S as TaskService (TS)
    participant R as routers/tasks
    participant SV as TaskService (Py)
    participant DB as PostgreSQL

    U->>F: Completa y envía
    F->>F: Valida (mismas reglas que el backend)
    F->>S: create(payload)
    S->>R: POST /tasks
    R->>R: Pydantic valida title/status/due_date
    alt payload inválido
        R-->>S: 422 [{loc, msg}]
        S-->>F: ApiError.fieldErrors → error bajo cada campo
    else válido
        R->>SV: create_task(data)
        SV->>DB: SELECT categoría
        alt no existe
            SV-->>R: BusinessRuleError
            R-->>S: 422 {"detail": "La categoría con id N no existe"}
        else existe
            SV->>DB: INSERT + COMMIT
            R-->>S: 201 Task (con category embebida)
            S-->>F: ok → cierra modal, recarga la vista
        end
    end
```

### Completar tarea con un clic — actualización optimista (Caso 4)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant C as TaskCard
    participant H as useTasks
    participant API as PATCH /tasks/{id}

    U->>C: Clic en ✓
    C->>H: update(id, {status: "Completada"})
    H->>H: Pinta el cambio al instante (guarda estado previo)
    H->>API: PATCH
    alt 200
        API-->>H: Task actualizada (completed_at)
        H->>H: Reemplaza con la versión del servidor
    else error / sin red
        API-->>H: ApiError
        H->>H: Revierte al estado previo
        H-->>U: Toast con mensaje amigable
    end
```

## Contrato de la API

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| `GET` | `/categories` | Lista de categorías | `200 Category[]` |
| `GET` | `/tasks` | Lista filtrada y paginada. Query: `status`, `category_id`, `q` (título/descripción), `limit` (1–100, def. 50), `offset` | `200 Task[]` + `X-Total-Count`; `422` filtro inválido |
| `GET` | `/tasks/summary` | Conteos para el tablero: por estado, vencidas, que vencen hoy y por categoría. Query: `category_id`, `today` (fecha local del cliente) | `200 TaskSummary` |
| `GET` | `/tasks/{id}` | Detalle | `200 Task` + `ETag`; `404 {"detail":"Tarea no encontrada"}` |
| `POST` | `/tasks` | Crear | `201 Task` + `Location` + `ETag`; `422` validación o categoría inexistente |
| `PATCH` | `/tasks/{id}` | Actualización parcial (p. ej. `{"status":"Completada"}`). `If-Match` opcional | `200 Task` + `ETag`; `404`; `412` versión desactualizada; `409` carrera; `422` |
| `DELETE` | `/tasks/{id}` | Eliminar. `If-Match` opcional | `204`; `404`; `412` |
| `GET` | `/health` | Readiness: base de datos + revisión del esquema | `200 {"status","database","schema","version"}` / `503` |
| `GET` | `/health/live` | Liveness: el proceso responde | `200` |

Errores transversales: `400` Host no permitido · `409` violación de integridad o edición
concurrente · `429` rate limit (con `Retry-After`) · `500 {"detail":"Error interno del servidor.","request_id":"…"}` ·
`503` base de datos caída (con `Retry-After`). Documentación interactiva en `/docs` (solo fuera de producción).

**¿Por qué `X-Total-Count` y no `{items, total}`?** El PDF define `GET /tasks` como
lista de tareas; mantener el cuerpo como arreglo plano respeta ese contrato y la
paginación viaja en una cabecera (expuesta vía CORS con `expose_headers`).

## Concurrencia optimista (ETag / If-Match)

```mermaid
sequenceDiagram
    participant A as Usuario A
    participant B as Usuario B
    participant API as API
    participant DB as PostgreSQL

    A->>API: GET /tasks/7
    API-->>A: 200 · ETag "7-3"
    B->>API: GET /tasks/7
    API-->>B: 200 · ETag "7-3"
    B->>API: PATCH /tasks/7 · If-Match "7-3"
    API->>DB: UPDATE … SET version=4 WHERE id=7 AND version=3
    API-->>B: 200 · ETag "7-4"
    A->>API: PATCH /tasks/7 · If-Match "7-3"
    API-->>A: 412 "La tarea fue modificada por otra persona…"
    Note over A: Recarga, ve el cambio de B y decide
```

- `If-Match` es **opcional**: sin él, gana la última escritura (lo que el PDF espera).
- Aun sin `If-Match`, si dos `UPDATE` parten de la misma lectura, el `WHERE version = :leída`
  del segundo no encuentra fila y SQLAlchemy lanza `StaleDataError` → `409`.
- Cada tarea expone también `version` en el cuerpo, para clientes que no leen cabeceras.

## Migraciones

| Revisión | Cambio |
|---|---|
| `0001` | Esquema inicial: `categories`, `tasks`, constraints e índices |
| `0002` | `tasks.version` (bloqueo optimista), con `server_default` para filas existentes |

- `alembic upgrade head` (CLI) o `python seed.py` (migra + siembra). En desarrollo, la API lo hace al arrancar.
- **Adopción de bases previas:** si existe `tasks` pero no `alembic_version` (base creada con
  `create_all`), se marca como `0001` y se aplica lo pendiente, sin perder datos.
- **Garantías probadas** (`tests/test_migrations.py`): las migraciones generan exactamente el
  esquema de los modelos (`compare_metadata` vacío), `downgrade base` + `upgrade head` funciona,
  y la adopción de una base previa conserva sus datos.
- Regla de evolución: migraciones **aditivas** (compatibles con la versión anterior del
  código), para poder volver atrás una versión sin tocar el esquema.

## Observabilidad

- **`request_id` de punta a punta:** se genera por request (o se reutiliza el `X-Request-ID`
  entrante si es seguro), vuelve en la respuesta y aparece en cada línea de log. Un `500`
  incluye el `request_id` en el cuerpo para que soporte lo encuentre en segundos.
- **Logs estructurados:** `LOG_FORMAT=json` emite una línea JSON por evento
  (`ts, level, logger, msg, request_id, status, duration_ms, client_ip`), lista para
  journald/Loki/CloudWatch. En desarrollo, formato texto legible.
- **Health checks separados:** `/health/live` (el proceso responde) y `/health`
  (base de datos + revisión de esquema), usado por el healthcheck de Docker.

## Calidad y CI

| Control | Herramienta | Dónde |
|---|---|---|
| Estilo y bugs comunes (incl. reglas de seguridad `bandit`) | `ruff check` + `ruff format` | local, CI |
| Tipos | `mypy --strict` + plugin de Pydantic | local, CI |
| Pruebas + cobertura ≥ 90 % | `pytest` + `pytest-cov` (79 pruebas, 98 %) | local, CI |
| Mismo código en ambos motores | pruebas en SQLite **y** PostgreSQL 16 | CI (Python 3.10 y 3.12) |
| Frontend compila con tipos estrictos | `tsc` + `vite build` | CI |
| El stack completo levanta y cumple los 5 casos | `docker compose up --wait` + `curl` vía Nginx | CI |

## Seguridad aplicada

Mismo enfoque de capas que uso en IndexUNI en producción, acotado a lo que vive en este
repositorio. El modelo de amenazas completo está en [SEGURIDAD.md](SEGURIDAD.md).

| Capa | Control |
|---|---|
| Borde (Nginx del contenedor) | CSP `'self'` sin `unsafe-*` ni scripts inline, `X-Frame-Options DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `server_tokens off`, `limit_req` por IP (`429`), `client_max_body_size 64k`, dotfiles bloqueados, `X-Forwarded-For` sobrescrito (no falsificable). |
| API | CORS por lista blanca exacta (orígenes, métodos, cabeceras; sin credenciales) · `TrustedHostMiddleware` · rate limit por IP (`slowapi`) · CSP `default-src 'none'` en JSON · `Cache-Control: no-store` · docs apagadas en producción · **la config se niega a arrancar en producción si es permisiva** · `statement_timeout` en PostgreSQL · `--no-server-header`. |
| Entrada | Pydantic tipa y acota todo; ORM con parámetros enlazados (sin inyección SQL); búsqueda con `autoescape` (`%`/`_` literales). |
| Errores y logs | Nunca stack traces al cliente; `request_id` para correlacionar; `X-Request-ID` entrante solo si es alfanumérico (sin inyección en logs). |
| Datos | Integridad en la base (`CHECK`, `FK RESTRICT`, `UNIQUE`) y bloqueo optimista contra ediciones concurrentes. |
| Contenedores | Imagen de la API sin root, base sin puertos publicados, API publicada solo en `127.0.0.1`. |
| Frontend | React escapa todo el contenido; confirmación antes de borrar; timeout en peticiones. |