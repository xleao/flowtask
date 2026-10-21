# ADR-011: Observabilidad: request_id, logs estructurados y health checks

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

Cuando un usuario reporta un error, hace falta encontrar la traza exacta.

## Decisión

Cada request recibe un `request_id` (o reutiliza un `X-Request-ID` entrante si es seguro) que vuelve en la respuesta y aparece en cada línea de log. `LOG_FORMAT=json` emite una línea JSON por evento. `/health/live` informa del proceso; `/health`, de la base y la revisión del esquema (lo usa el healthcheck de Docker).

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| `print` / logs de texto sueltos | No se pueden correlacionar ni consultar. |

## Consecuencias

- ✅ Un 500 lleva directo a su traza.
- ✅ Docker arranca los servicios en orden según su salud real.
- ⚠️ Un middleware más en cada request (costo despreciable).

## Referencias

`backend/app/core/logging.py`, `backend/app/core/middleware.py`
