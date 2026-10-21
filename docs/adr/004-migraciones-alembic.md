# ADR-004: Migraciones con Alembic y adopción de bases previas

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

`create_all` no versiona cambios: agregar la columna `version` habría exigido borrar la base.

## Decisión

**Alembic** es la fuente de verdad del esquema (`0001` inicial y `0002` versión). `python seed.py` migra y luego siembra. Si existe `tasks` pero no `alembic_version` (una base creada antes), se marca como `0001` y se aplica lo pendiente sin perder datos.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| `Base.metadata.create_all` | No permite evolucionar el esquema con datos ya cargados. |

## Consecuencias

- ✅ Una prueba verifica que las migraciones producen exactamente los modelos y que son reversibles.
- ✅ Las bases existentes se actualizan sin intervención manual.
- ⚠️ Cada cambio de modelo exige escribir su migración.

## Referencias

`backend/migrations/`, `backend/seed.py`, `tests/test_migrations.py`
