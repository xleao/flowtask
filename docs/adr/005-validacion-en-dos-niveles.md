# ADR-005: Validación en dos niveles; categoría inexistente → 422

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El PDF pide rechazar títulos vacíos, estados inválidos y fechas inválidas, y responder 404 **o** 422 cuando la categoría no existe.

## Decisión

- **Pydantic** valida lo que se sabe mirando solo el payload: título no vacío tras quitar espacios, longitudes, enum de estado, fecha ISO y un límite de 5 años (atrapa errores de tipeo en el año).
- **TaskService** valida lo que requiere consultar la base: que la categoría exista.
- Una categoría inexistente responde **422** con `La categoría con id N no existe`: la ruta `/tasks` existe; lo inválido es una referencia dentro del cuerpo.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| 404 para la categoría | Confunde "la ruta no existe" con "un dato del cuerpo es inválido". |

## Consecuencias

- ✅ El frontend aplica las mismas reglas antes de enviar y muestra los 422 del backend bajo cada campo.
- ✅ La base también lo garantiza (`CHECK`, `FK`), ver ADR-006.
- ⚠️ Las reglas existen en tres lugares (UI, Pydantic, BD) y hay que mantenerlas alineadas.

## Referencias

`backend/app/schemas/task.py`, `backend/app/services/task_service.py`
