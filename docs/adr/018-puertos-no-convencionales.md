# ADR-018: Puertos no convencionales (5180, 8010, 8080)

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El equipo de desarrollo ya usa 5173 y 8000 en otro proyecto; los valores por defecto chocan.

## Decisión

Vite en **5180**, API en **8010** y Docker en **8080**. Si el 5180 está ocupado, Vite toma el siguiente: en desarrollo CORS acepta `localhost` en cualquier puerto ([ADR-010](010-seguridad-por-capas.md)).

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Puertos por defecto (5173 / 8000) | Chocan con otros proyectos locales. |

## Consecuencias

- ✅ Convive con otros proyectos sin conflictos.
- ⚠️ Fuera de desarrollo, un origen nuevo del frontend debe agregarse a `CORS_ORIGINS`.

## Referencias

`frontend/vite.config.ts`, `backend/app/core/config.py`
