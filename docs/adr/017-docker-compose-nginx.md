# ADR-017: Docker Compose con Nginx como mismo origen

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El extra del PDF pide levantar backend, frontend y base con `docker compose up`.

## Decisión

Tres servicios: `db` (postgres:16-alpine, sin puerto publicado), `backend` (python:3.12-slim, sin root, migra y siembra al arrancar) y `frontend` (build con Node, servido por nginx:1.27-alpine). Nginx sirve la SPA y redirige `/api` al backend, así que en Docker no hace falta CORS. El orden de arranque depende de los healthchecks.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Servir la SPA con `vite preview` | No está pensado para producción: no hay gzip, CSP ni caché. |

## Consecuencias

- ✅ Un comando levanta todo; verificado con los 5 casos vía `http://localhost:8080`.
- ✅ Mismo origen: CSP `'self'` alcanza.
- ⚠️ La primera construcción tarda unos minutos.

## Referencias

`docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`
