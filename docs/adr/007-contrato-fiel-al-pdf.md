# ADR-007: Contrato fiel al PDF: `GET /tasks` devuelve un arreglo y el total va en `X-Total-Count`

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El extra de paginación (`limit`/`offset`) necesita informar el total, pero el PDF define `GET /tasks` como una lista de tareas.

## Decisión

El cuerpo sigue siendo un **arreglo plano** y el total viaja en la cabecera `X-Total-Count`, expuesta por CORS. Todo lo que se agregó es opcional para el cliente: `q`, `/tasks/summary` e `If-Match`.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Envolver en `{items, total}` | Rompe el contrato que un evaluador probaría con `curl`. |

## Consecuencias

- ✅ Cualquier cliente del PDF sigue funcionando sin cambios.
- ⚠️ El total no se ve en el cuerpo; hay que leer la cabecera.

## Referencias

`backend/app/routers/tasks.py`, [contrato de la API](../ARQUITECTURA.md#contrato-de-la-api)
