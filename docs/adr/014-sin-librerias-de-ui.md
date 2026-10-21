# ADR-014: Sin librerías de UI: CSS propio, `<dialog>` nativo y `fetch`

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El PDF acepta Tailwind, Material, Bootstrap o CSS limpio. La interfaz debía ser liviana y tener identidad propia.

## Decisión

Solo hay tres dependencias de ejecución: `react`, `react-dom` y las fuentes `@fontsource`. Los modales usan `<dialog>` nativo (foco atrapado, `Esc`), los íconos son SVG inline, los filtros son `<select>` nativos y el HTTP usa `fetch`.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Material / Bootstrap | Se ven genéricos y pesan más que toda la app. |
| Tailwind | Es válido, pero suma build y clases largas para un solo archivo de estilos. |

## Consecuencias

- ✅ CSS de 10.7 KB gzip y accesibilidad nativa del navegador.
- ✅ Nada que actualizar por vulnerabilidades de terceros.
- ⚠️ `styles.css` es largo; se ordenó por secciones y capas.

## Referencias

`frontend/package.json`, `frontend/src/styles.css`
