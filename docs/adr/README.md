# Registro de decisiones de arquitectura (ADR)

Cada archivo documenta **una** decisión: el contexto que la motivó, qué se decidió, qué alternativas se descartaron y qué consecuencias tiene. Formato basado en [MADR](https://adr.github.io/madr/). Todas están **aceptadas** y reflejan el código actual.

| ADR | Decisión |
|---|---|
| [ADR-001](001-arquitectura-en-capas.md) | Arquitectura en capas con servicios que no conocen HTTP |
| [ADR-002](002-fastapi-sqlalchemy-2.md) | FastAPI + SQLAlchemy 2.0 tipado (no SQLModel) |
| [ADR-003](003-postgresql-con-sqlite-compatible.md) | Dos motores con el mismo código: SQLite por defecto, PostgreSQL para uso real |
| [ADR-004](004-migraciones-alembic.md) | Migraciones con Alembic y adopción de bases previas |
| [ADR-005](005-validacion-en-dos-niveles.md) | Validación en dos niveles; categoría inexistente → 422 |
| [ADR-006](006-integridad-en-la-base.md) | La base de datos también defiende la integridad (`status` como VARCHAR + CHECK) |
| [ADR-007](007-contrato-fiel-al-pdf.md) | Contrato fiel al PDF: `GET /tasks` devuelve un arreglo y el total va en `X-Total-Count` |
| [ADR-008](008-concurrencia-optimista.md) | Concurrencia optimista con ETag / If-Match |
| [ADR-009](009-errores-de-dominio.md) | Errores de dominio con handlers globales: nunca un 500 por un recurso inexistente |
| [ADR-010](010-seguridad-por-capas.md) | Seguridad por capas acotada al repositorio |
| [ADR-011](011-observabilidad.md) | Observabilidad: request_id, logs estructurados y health checks |
| [ADR-012](012-react-en-lugar-de-angular.md) | React + TypeScript + Vite en lugar de Angular |
| [ADR-013](013-estado-frontend.md) | Estado del frontend: componentes presentacionales, un hook y servicios |
| [ADR-014](014-sin-librerias-de-ui.md) | Sin librerías de UI: CSS propio, `<dialog>` nativo y `fetch` |
| [ADR-015](015-diseno-tron-sereno.md) | Diseño visual "TRON sereno" |
| [ADR-016](016-rendimiento-equipos-lentos.md) | Rendimiento en equipos lentos: modo ligero automático |
| [ADR-017](017-docker-compose-nginx.md) | Docker Compose con Nginx como mismo origen |
| [ADR-018](018-puertos-no-convencionales.md) | Puertos no convencionales (5180, 8010, 8080) |
| [ADR-019](019-fuera-de-alcance.md) | Sin autenticación ni CRUD de categorías |
| [ADR-020](020-calidad-automatizada.md) | Calidad automatizada: app factory, pruebas contra base real y CI |

Para agregar una decisión: copiar el formato de cualquier ADR, usar el siguiente número y, si reemplaza a otra, marcar la anterior como **Reemplazada por ADR-NNN**.
