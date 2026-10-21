# ADR-010: Seguridad por capas acotada al repositorio

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

Es una herramienta interna, pero expuesta por HTTP. Se aplicaron las prácticas que el autor usa en un sistema en producción.

## Decisión

- **CORS** con lista blanca exacta de orígenes (validados al arrancar), métodos y cabeceras, sin credenciales. Solo en desarrollo se acepta además `localhost`/`127.0.0.1` en cualquier puerto: son orígenes de la propia máquina, y así el frontend no queda atado a un puerto.
- **Rate limit** por IP en la app (`slowapi`, 120/min) y en Nginx (`limit_req`).
- **CSP** `'self'` sin `unsafe-*`, `X-Frame-Options DENY`, `nosniff`, validación de `Host`.
- La configuración **se niega a arrancar en producción** si es permisiva (hosts `*`, SQLite).
- `statement_timeout`, contenedores sin root y base sin puertos publicados.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| CORS `*` | Es lo más cómodo, pero el PDF pide explícitamente CORS estricto. |

## Consecuencias

- ✅ Defensa en profundidad: si falla una capa, quedan otras.
- ✅ Todo está cubierto por `tests/test_security.py`.
- ⚠️ En desarrollo, cualquier app abierta en `localhost` puede llamar a la API (riesgo bajo: es la máquina del propio desarrollador).

## Referencias

`backend/main.py`, `backend/app/core/`, `frontend/nginx.conf`
