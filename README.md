# FlowTask

Gestor de tareas por categorías para pequeños equipos — prueba técnica **Practicante Fullstack Developer (Sintad)**.

**Stack:** Python 3.10+ · FastAPI · SQLAlchemy 2.0 · Alembic · SQLite o PostgreSQL · React 18 + TypeScript · Vite · pytest · Docker Compose · GitHub Actions

| | |
|---|---|
| ✅ Caso 1 | Migraciones Alembic + categorías base sembradas (`seed.py`, idempotente) · `GET /categories` |
| ✅ Caso 2 | `POST /tasks` → `201` + `Location`; categoría inexistente → `422` con mensaje claro; estado inválido → `422` Pydantic |
| ✅ Caso 3 | Tablero con título, categoría (nombre), fecha límite y estado; dropdown de estado (Todos / Pendiente / En Progreso / Completada) y filtro por categoría, ambos vía backend; HTTP encapsulado en `TaskService`; interfaces TS estrictas |
| ✅ Caso 4 | Completar/reabrir con un clic (`PATCH`), eliminar con confirmación (`DELETE`), UI actualizada al instante (optimista, con rollback) |
| ✅ Caso 5 | `GET /tasks/99999` → `404 {"detail": "Tarea no encontrada"}`; nunca un `500` por recursos inexistentes |
| ⭐ Extras del PDF | `docker-compose.yml` · **79 pruebas** pytest + TestClient (cobertura 98 %, mínimo exigido 90 %) · paginación `limit`/`offset` |
| ⭐ Más allá | Control de concurrencia (ETag / `If-Match` → `412`) · búsqueda `?q=` · resumen para el tablero · logs JSON con `request_id` · CI contra PostgreSQL real · `ruff` + `mypy --strict` |

## Documentación

| Documento | Contenido |
|---|---|
| [Requerimientos](docs/REQUERIMIENTOS.md) | RF, RNF, reglas de negocio, criterios Gherkin |
| [Arquitectura](docs/ARQUITECTURA.md) | Diagramas C4, modelo de datos, flujos, despliegue |
| [Decisiones (ADR)](docs/adr/README.md) | 20 decisiones con contexto, alternativas y consecuencias |
| [API](docs/API.md) | Endpoints, ejemplos, errores y cabeceras |
| [Diseño UX/UI](docs/DISENO_UI.md) | Sistema visual "TRON sereno" |
| [Pruebas](docs/PRUEBAS.md) | Estrategia y trazabilidad PDF → prueba |
| [Seguridad](docs/SEGURIDAD.md) | Modelo de amenazas STRIDE y controles |
| [Operación](docs/OPERACION.md) | Configuración, logs, respaldos, solución de problemas |
| [Guía de desarrollo](CONTRIBUTING.md) · [Glosario](docs/GLOSARIO.md) | Convenciones y términos |

Índice completo: [docs/README.md](docs/README.md).

---

## Requisitos previos

- **Python 3.10+**
- **Node.js 18+** (probado con 22)
- **Base de datos:** nada que instalar (SQLite, por defecto) **o** PostgreSQL 13+ — el mismo código funciona con ambas

## 1. Levantar el backend

```bash
cd backend

# Entorno virtual
python -m venv .venv
# Windows (PowerShell):   .venv\Scripts\Activate.ps1
# Linux / macOS:          source .venv/bin/activate

# Dependencias
pip install -r requirements.txt
# Opcional, para correr pruebas y linters (agrega pytest, ruff, mypy):
pip install -r requirements-dev.txt

# Configuración
cp .env.example .env          # Windows: copy .env.example .env
```

**Elegir la base de datos** (el mismo código funciona con las dos; solo cambia `DATABASE_URL` en `.env`):

| Opción | Qué hacer | Cuándo |
|---|---|---|
| **SQLite** (por defecto) | Nada: se crea `backend/flowtask.db` al correr el seed | Para revisar el proyecto rápido, sin instalar nada |
| **PostgreSQL** | Crear la base (abajo) y en `.env` activar la línea `DATABASE_URL=postgresql+psycopg://…` | Uso real con varios usuarios; es lo que usa Docker |

```sql
-- Solo para PostgreSQL, una vez, como superusuario:
CREATE USER flowtask WITH PASSWORD 'flowtask';
CREATE DATABASE flowtask OWNER flowtask;
```

**Migraciones + semilla:**

```bash
alembic upgrade head    # crea/actualiza el esquema
python seed.py          # categorías base: Trabajo, Personal, Urgente, Proyectos
```

> `python seed.py` también aplica las migraciones pendientes antes de sembrar, así
> que basta con ese comando. Ambos son idempotentes.

**Servidor:**

```bash
uvicorn main:app --reload --port 8010
```

- API: http://localhost:8010
- Documentación interactiva (Swagger): http://localhost:8010/docs
- Salud: http://localhost:8010/health (incluye la versión del esquema)

> En desarrollo la API migra y siembra sola al arrancar (`INIT_DB_ON_STARTUP=true`).

**Calidad:**

```bash
pytest              # 79 pruebas + cobertura (falla si baja de 90 %). SQLite en memoria: no toca tu base
ruff check . && ruff format --check .
mypy .              # modo strict

# Las mismas pruebas contra PostgreSQL real (base desechable: se borra en cada test):
TEST_DATABASE_URL=postgresql+psycopg://flowtask:flowtask@localhost:5432/flowtask_test pytest
```

## 2. Levantar el frontend

En otra terminal:

```bash
cd frontend
npm install
cp .env.example .env          # Windows: copy .env.example .env   (opcional: el valor por defecto ya apunta a :8010)
npm start                     # equivalente a `npm run dev`
```

Abrir **http://localhost:5180**.

> **CORS:** en desarrollo la API acepta el frontend desde `localhost` en cualquier puerto
> (si el 5180 está ocupado, Vite usa el siguiente y todo sigue funcionando). Fuera de
> desarrollo solo se aceptan los orígenes exactos de `CORS_ORIGINS`.

Build de producción: `npm run build` (incluye chequeo de tipos con `tsc`).

## 3. Alternativa: todo con Docker

```bash
docker compose up --build
```

- App: http://localhost:8080 (Nginx sirve la SPA y enruta `/api` al backend)
- API directa: http://localhost:8010/docs

El pipeline de CI levanta este mismo `docker compose` y recorre los 5 casos con `curl` a través de Nginx.

---

## Probar la API rápido

```bash
curl http://localhost:8010/categories

curl -i -X POST http://localhost:8010/tasks -H "Content-Type: application/json" \
  -d '{"title":"Preparar informe","due_date":"2026-10-30","category_id":1}'      # 201 + Location + ETag

curl -i "http://localhost:8010/tasks?status=Pendiente&limit=10&offset=0"          # X-Total-Count
curl "http://localhost:8010/tasks?q=informe"                                       # búsqueda

curl -X PATCH http://localhost:8010/tasks/1 -H "Content-Type: application/json" \
  -d '{"status":"Completada"}'

# Concurrencia: con un ETag viejo la edición se rechaza en vez de pisar otra
curl -i -X PATCH http://localhost:8010/tasks/1 -H 'If-Match: "1-1"' \
  -H "Content-Type: application/json" -d '{"title":"x"}'                           # 412

curl -i -X DELETE http://localhost:8010/tasks/1      # 204
curl http://localhost:8010/tasks/99999               # 404 {"detail":"Tarea no encontrada"}
```

---

## Estructura

```
flowtask/
├── backend/
│   ├── app/
│   │   ├── routers/        # Controladores HTTP (categories, tasks): sin lógica de negocio
│   │   ├── services/       # Reglas de negocio + unidad de trabajo (commit) + precondiciones
│   │   ├── repositories/   # Consultas SQLAlchemy (filtros, búsqueda, paginación, agregados)
│   │   ├── models/         # Modelos SQLAlchemy 2.0 (tipados, CHECK/FK/índices, versión)
│   │   ├── schemas/        # Pydantic: validación de entrada y forma de salida
│   │   ├── core/           # Config, errores, logging estructurado, middleware de seguridad
│   │   └── database.py     # Engine, sesión y Depends(get_db)
│   ├── migrations/         # Alembic (0001 esquema inicial, 0002 versión para ETag)
│   ├── tests/              # pytest: casos 1–5, concurrencia, migraciones, seguridad
│   ├── main.py             # create_app(): middleware, routers, handlers, health
│   └── seed.py             # Migra + siembra (idempotente)
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Orquestador: estado de la vista y conexión entre piezas
│   │   ├── components/     # TaskList, TaskCard, TaskForm, FilterBar, Sidebar, Topbar, SearchBox,
│   │   │                   # QuickCapture, LoadError, Modal, ConfirmDialog, Pagination, Toasts…
│   │   ├── hooks/          # useTasks (datos + optimismo), useTaskActions, useCategories,
│   │   │                   # useEffectsMode, useHotkey
│   │   ├── services/       # apiClient (timeout, errores), TaskService, CategoryService
│   │   ├── types/          # Interfaces TS: Task, Category, TaskStatus, TaskSummary
│   │   ├── utils/          # Fechas relativas, modo ligero, atajos por plataforma
│   │   └── styles.css      # Sistema visual "TRON sereno"
│   ├── nginx.conf          # SPA + proxy /api + CSP (imagen Docker)
│   └── vite.config.ts      # Dev server en :5180
├── docs/                   # Requerimientos, arquitectura C4, ADR, API, diseño, pruebas, seguridad, operación
├── .github/                # CI (lint, tipos, pruebas SQLite + PostgreSQL, build, docker e2e)
└── docker-compose.yml
```

---

## Decisiones de Diseño y Arquitectura

Organicé el proyecto para que **cada pieza tenga una sola razón para cambiar** y para que
cada criterio del PDF se pueda demostrar con una prueba automatizada.

1. **Capas con dependencias en una sola dirección** (`routers → services → repositories → models`).
   Los routers solo traducen HTTP, los servicios tienen las reglas y no conocen FastAPI, los
   repositorios encapsulan el SQL. Así la lógica se prueba y reutiliza sin levantar la API
   (el seed usa el mismo `CategoryService`). → [ADR-001](docs/adr/001-arquitectura-en-capas.md)
2. **Validación en dos niveles.** Pydantic valida el formato (título, estado, fecha); el servicio
   valida lo que requiere la base (que la categoría exista → `422` con mensaje claro), y la base
   lo vuelve a garantizar con `CHECK`, `FK` y `UNIQUE`. → [ADR-005](docs/adr/005-validacion-en-dos-niveles.md), [ADR-006](docs/adr/006-integridad-en-la-base.md)
3. **Contrato fiel al PDF.** `GET /tasks` sigue devolviendo un arreglo; la paginación informa el
   total en `X-Total-Count`, y todo lo agregado (búsqueda, resumen, `If-Match`) es opcional. → [ADR-007](docs/adr/007-contrato-fiel-al-pdf.md)
4. **Errores estandarizados.** Excepciones de dominio + handlers globales: siempre
   `{"detail": "..."}` y nunca un `500` por un recurso inexistente. → [ADR-009](docs/adr/009-errores-de-dominio.md)
5. **Frontend por responsabilidades.** Componentes presentacionales, el estado en un hook
   (`useTasks`, con actualizaciones optimistas), las acciones en `useTaskActions` y todo el
   HTTP en servicios tipados. `App.tsx` solo orquesta. → [ADR-013](docs/adr/013-estado-frontend.md)
6. **Interfaz "TRON sereno".** Identidad propia pero calmada para uso diario: el color solo
   marca significado, lo urgente aparece primero y funciona fluido en equipos modestos. → [ADR-015](docs/adr/015-diseno-tron-sereno.md)

Además: migraciones con Alembic, concurrencia optimista, seguridad por capas, logs con
`request_id`, Docker y CI. Las **20 decisiones** completas, con sus alternativas descartadas,
están en [docs/adr](docs/adr/README.md).

---

**Autor:** Jhostin Rodríguez
