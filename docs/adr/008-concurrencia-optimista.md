# ADR-008: Concurrencia optimista con ETag / If-Match

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

En un equipo, dos personas pueden editar la misma tarea a la vez; sin control, la segunda pisa a la primera sin aviso.

## Decisión

Cada tarea tiene una `version` que SQLAlchemy incrementa en cada `UPDATE` (`WHERE version = :leída`). Viaja como `ETag`. Un `If-Match` desactualizado responde **412**; una carrera sin `If-Match` se detecta igual y responde **409**. `If-Match` es **opcional**: sin él gana la última escritura, como espera el PDF.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Bloqueo pesimista (`SELECT ... FOR UPDATE`) | Mantiene locks mientras la persona edita; no encaja con HTTP sin estado. |
| No hacer nada | Pierde ediciones en silencio. |

## Consecuencias

- ✅ No se pierden cambios sin aviso.
- ✅ No obliga a ningún cliente a usarlo.
- ⚠️ Una columna y una migración más (`0002`).

## Referencias

`backend/app/models/task.py`, `tests/test_concurrency.py`
