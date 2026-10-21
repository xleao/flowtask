# ADR-016: Rendimiento en equipos lentos: modo ligero automático

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

Las laptops corporativas suelen tener gráficos integrados; `backdrop-filter` y `blur` sobre un fondo animado se recalculaban en cada cuadro.

## Decisión

Sin `backdrop-filter` ni `filter: blur`; las animaciones solo usan `transform`; nunca `transition: all`. Un **modo ligero** (`html.perf-lite`) se activa solo si el equipo tiene 4 núcleos o menos, 4 GB de RAM o menos, ahorro de datos o "reducir movimiento", o si se miden menos de 40 FPS al cargar. Se cambia con el botón ⚡ y la preferencia se recuerda.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Ignorar el problema | La app se trababa al abrir modales en equipos modestos. |

## Consecuencias

- ✅ Fluida en hardware de gama baja sin perder la estética en equipos buenos.
- ⚠️ La detección es heurística; por eso existe el botón manual.

## Referencias

`frontend/src/utils/effects.ts`, capa "MODO LIGERO" de `styles.css`
