# ADR-013: Estado del frontend: componentes presentacionales, un hook y servicios

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El caso 4 exige reflejar los cambios sin recargar; el caso 3, encapsular el HTTP en un servicio.

## Decisión

- **Componentes presentacionales:** reciben props y emiten eventos.
- **`useTasks`** concentra la carga paginada, el resumen y las mutaciones **optimistas** (pinta al instante y revierte si falla). Descarta respuestas obsoletas cuando los filtros cambian rápido.
- **`useTaskActions`** traduce cada acción del usuario (guardar, completar, eliminar) en una mutación y su aviso.
- **`App.tsx`** solo orquesta: estado de la vista (filtros, modales) y conexión entre hooks y componentes. Lo transversal va en hooks propios: `useCategories`, `useEffectsMode`, `useHotkey`.
- **`services/`** tiene todo el HTTP; `apiClient` centraliza timeout (10 s), errores de FastAPI y mensajes amigables.
- `SearchBox` y `QuickCapture` guardan su propio texto para que escribir no re-renderice el tablero.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Redux / Zustand / React Query | Una dependencia más para un solo recurso; un hook alcanza. |

## Consecuencias

- ✅ Respuesta inmediata en la UI.
- ✅ Cumple literalmente el criterio de "servicio" del PDF.
- ⚠️ Si la app creciera a muchos recursos, convendría React Query.

## Referencias

`frontend/src/App.tsx`, `frontend/src/hooks/`, `frontend/src/services/`
