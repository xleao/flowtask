# ADR-002: FastAPI + SQLAlchemy 2.0 tipado (no SQLModel)

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El PDF permite SQLAlchemy 2.0 o SQLModel. Se necesitaban constraints (`CHECK`, índice funcional `lower(name)`), bloqueo optimista y migraciones.

## Decisión

Usar **SQLAlchemy 2.0** con `Mapped[...]` y `mapped_column` para los modelos, y **Pydantic v2** aparte para los esquemas de entrada y salida.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| SQLModel | Une modelo y esquema, pero mezcla validación HTTP con persistencia y va detrás de SQLAlchemy en funciones avanzadas (`version_id_col`, índices funcionales). |

## Consecuencias

- ✅ Separar los modelos (persistencia) de los esquemas (contrato) permite cambiar uno sin romper el otro.
- ✅ Tipado completo: `mypy --strict` pasa sin `Any`.
- ⚠️ Hay que mantener el modelo y el esquema por separado.

## Referencias

`backend/app/models/`, `backend/app/schemas/`
