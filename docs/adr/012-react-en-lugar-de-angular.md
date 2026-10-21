# ADR-012: React + TypeScript + Vite en lugar de Angular

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El PDF prefiere Angular, pero acepta React; ambos con TypeScript obligatorio. El plazo era de dos días.

## Decisión

**React 18 + TypeScript estricto + Vite**: el stack que el autor domina mejor, para entregar con calidad dentro del plazo. Se replican los conceptos que el PDF describe en términos de Angular: servicios para el HTTP (`TaskService`), interfaces tipadas y componentes reutilizables.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Angular | Es el preferido por la empresa, pero aprenderlo bajo plazo habría bajado la calidad del resto. |

## Consecuencias

- ✅ Bundle pequeño (57 KB gzip de JS) y build en menos de 2 s.
- ✅ `strict: true` sin `any`.
- ⚠️ No coincide con la preferencia declarada de Sintad; podría restar algo en la evaluación.

## Referencias

`frontend/`, `frontend/tsconfig.json`
