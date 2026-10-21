# ADR-019: Sin autenticación ni CRUD de categorías

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El PDF no pide usuarios y sus casos llaman a la API sin credenciales; de categorías solo pide `GET`.

## Decisión

No implementar autenticación ni alta/edición de categorías (se administran con el seed). La arquitectura permite agregar auth como un `Depends(get_current_user)` en los routers sin tocar servicios ni repositorios.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Agregar JWT | Rompería el contrato que se evalúa con `curl`. |

## Consecuencias

- ✅ El alcance coincide exactamente con lo evaluado.
- ⚠️ No apto para uso real multiusuario sin agregar auth.

## Referencias

[REQUERIMIENTOS · fuera de alcance](../REQUERIMIENTOS.md#6-fuera-de-alcance-decisiones-conscientes)
