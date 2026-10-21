# ADR-001: Arquitectura en capas con servicios que no conocen HTTP

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El PDF evalúa la separación de responsabilidades y propone `routers/`, `services/`, `repositories/`, `models/` y `schemas/`. Hacía falta decidir qué hace cada capa y quién controla la transacción.

## Decisión

Las dependencias van en una sola dirección: `routers → services → repositories → models`.

- **Routers:** traducen HTTP (parámetros, códigos, cabeceras). No tienen lógica de negocio.
- **Services:** aplican las reglas de negocio y deciden el `commit` (unidad de trabajo). No importan nada de FastAPI: lanzan `NotFoundError`, `BusinessRuleError` o `PreconditionFailedError`.
- **Repositories:** encapsulan las consultas SQLAlchemy. Nunca hacen `commit`.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Lógica dentro de los endpoints | Es rápido, pero no se puede probar ni reutilizar sin HTTP; justo lo que el PDF penaliza. |
| Repositorio genérico `CRUDBase[T]` | Abstrae de más para dos entidades y esconde las consultas específicas (búsqueda, agregados). |

## Consecuencias

- ✅ `seed.py` reutiliza `CategoryService` sin levantar la API.
- ✅ Cada capa se prueba por separado y los cambios quedan localizados.
- ⚠️ Más archivos que un CRUD plano, para un dominio pequeño.

## Referencias

`backend/app/`, [ARQUITECTURA · C4 nivel 3](../ARQUITECTURA.md#c4--nivel-3--componentes-del-backend)
