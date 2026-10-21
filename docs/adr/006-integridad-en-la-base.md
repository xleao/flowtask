# ADR-006: La base de datos también defiende la integridad (`status` como VARCHAR + CHECK)

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

Si alguien escribe fuera de la API (un script, una consola SQL), las reglas de la aplicación no lo protegen.

## Decisión

Duplicar en la base las reglas críticas: `CHECK` sobre `status` y sobre `title` no vacío, `FK ... ON DELETE RESTRICT` y un índice único sobre `lower(name)` en categorías. `status` se guarda como `VARCHAR + CHECK`, no como `ENUM` nativo.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| ENUM nativo de PostgreSQL | Agregar un estado exige `ALTER TYPE` y no existe en SQLite. |
| Validar solo en la app | Los datos quedan desprotegidos ante escrituras directas. |

## Consecuencias

- ✅ Los datos siguen siendo válidos aunque falle la capa de aplicación.
- ✅ Agregar un estado es cambiar un constraint.
- ⚠️ Una violación de integridad se traduce a 409 con un handler propio.

## Referencias

`backend/app/models/`, `migrations/versions/0001_initial_schema.py`
