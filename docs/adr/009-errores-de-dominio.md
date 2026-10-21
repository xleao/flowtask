# ADR-009: Errores de dominio con handlers globales: nunca un 500 por un recurso inexistente

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El caso 5 exige `404 {"detail": "Tarea no encontrada"}` y ninguna excepción no controlada.

## Decisión

Los servicios lanzan excepciones de dominio (`NotFoundError`, `BusinessRuleError`, `PreconditionFailedError`). Handlers globales las convierten en `{"detail": "..."}` con el código correcto. Un error inesperado responde un 500 genérico **con `request_id`**, sin stack trace.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| `raise HTTPException` dentro de los servicios | Acopla el negocio a HTTP (rompe ADR-001). |

## Consecuencias

- ✅ Formato de error uniforme, que el frontend muestra tal cual.
- ✅ Ningún detalle interno llega al cliente.
- ⚠️ Hay que registrar cada nueva excepción de dominio en el handler.

## Referencias

`backend/app/core/errors.py`
