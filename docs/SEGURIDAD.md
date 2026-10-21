# FlowTask — Seguridad

Modelo de amenazas, controles implementados y riesgos aceptados. La decisión general está
en [ADR-010](adr/010-seguridad-por-capas.md).

## 1. Alcance y supuestos

- Herramienta **interna** para pequeños equipos, sin autenticación por decisión del PDF
  ([ADR-019](adr/019-fuera-de-alcance.md)). Cualquiera que llegue a la API puede leer y modificar tareas.
- Los datos (títulos y descripciones de tareas) son de sensibilidad **baja a media**. No hay datos personales ni de pago.
- En producción se asume HTTPS en un proxy o balanceador delante de Nginx.

## 2. Activos

| Activo | Por qué importa |
|---|---|
| Datos de tareas y categorías | Planificación interna del equipo |
| Disponibilidad de la API | El tablero se usa todo el día |
| Integridad de los datos | Una edición perdida o un estado inválido confunde al equipo |
| Detalles internos (stack traces, versiones) | Ayudan a un atacante a planear un ataque |

## 3. Modelo de amenazas (STRIDE)

| Amenaza | Ejemplo en FlowTask | Control | Estado |
|---|---|---|---|
| **S**uplantación | Otra web llama a la API desde el navegador de un empleado | CORS con lista blanca exacta y sin credenciales; validación de `Host` | ✅ Mitigado |
| **T**ampering (alteración) | Inyección SQL en `q` o en filtros | ORM con parámetros enlazados; búsqueda con `autoescape`; Pydantic tipa toda entrada | ✅ Mitigado |
| | Dos ediciones simultáneas: una pisa a la otra | Bloqueo optimista con `version` + `ETag`/`If-Match` (412/409) | ✅ Mitigado |
| | Datos inválidos escritos fuera de la API | `CHECK`, `FK RESTRICT` y `UNIQUE` en la base | ✅ Mitigado |
| **R**epudio | No se puede saber qué pasó en un error | `request_id` en respuesta y logs; logs JSON en producción | ⚠️ Parcial: sin usuarios no hay autoría |
| **I**nformation disclosure | Un error 500 muestra el stack trace | Handler genérico con `request_id`; docs OpenAPI apagadas en producción; `--no-server-header`; `server_tokens off` | ✅ Mitigado |
| | XSS: un título con `<script>` | React escapa todo; CSP `script-src 'self'` sin `unsafe-inline` | ✅ Mitigado |
| | Clickjacking | `X-Frame-Options: DENY` y `frame-ancestors 'none'` | ✅ Mitigado |
| **D**enial of service | Ráfaga de peticiones | Rate limit en Nginx (20 r/s, ráfaga 40) y en la API (120/min por IP) → 429 | ✅ Mitigado |
| | Payload gigante | `client_max_body_size 64k`; límites de longitud en Pydantic | ✅ Mitigado |
| | Consulta lenta que bloquea la base | `statement_timeout` (5 s) en PostgreSQL | ✅ Mitigado |
| | Evadir el rate limit falsificando `X-Forwarded-For` | Nginx **sobrescribe** la cabecera, no la concatena | ✅ Mitigado |
| **E**levation of privilege | Escapar del contenedor como root | La imagen de la API corre con un usuario sin privilegios | ✅ Mitigado |
| | Base expuesta a la red | PostgreSQL sin puerto publicado; API publicada solo en `127.0.0.1` | ✅ Mitigado |
| | Desplegar con configuración insegura por descuido | En `production` la app **no arranca** con hosts `*`, CORS `*` o SQLite | ✅ Mitigado |

## 4. Controles por capa

| Capa | Controles |
|---|---|
| Nginx | CSP `'self'`, `X-Frame-Options DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `server_tokens off`, `limit_req`, `client_max_body_size`, archivos ocultos bloqueados |
| API (middleware) | `TrustedHostMiddleware`, CORS estricto, `slowapi`, CSP `default-src 'none'` en JSON, `Cache-Control: no-store`, `X-Request-ID` saneado |
| Entrada | Pydantic con tipos, rangos y longitudes; enum de estados |
| Datos | Constraints en la base; transacciones por servicio; bloqueo optimista |
| Configuración | `pydantic-settings`; validación estricta en producción; `.env` en `.gitignore` |
| Dependencias | Versiones exactas en `requirements.txt` y `package-lock.json`; `.env` fuera del repositorio |

Todo lo verificable está en `backend/tests/test_security.py` (17 pruebas).

## 5. Riesgos aceptados

| Riesgo | Por qué se acepta | Cómo se resolvería |
|---|---|---|
| Sin autenticación ni autorización | El PDF no la pide y sus casos usan la API sin credenciales | `Depends(get_current_user)` en los routers (OIDC/JWT) sin tocar servicios |
| Sin HTTPS dentro del stack | Se termina TLS en el proxy o balanceador de la empresa | Certificado en el proxy de borde; activar HSTS |
| En `development`, CORS acepta `localhost` en cualquier puerto | Son orígenes de la propia máquina del desarrollador; evita atar el frontend a un puerto | Desaparece solo en `test`/`production`, que usan la lista exacta |
| Rate limit en memoria | Un solo proceso en este alcance | `RATE_LIMIT_STORAGE_URI=redis://…` con varios workers |
| Sin escaneo automático de dependencias | Alcance de la prueba | Dependabot o `pip-audit` / `npm audit` en el CI |

## 6. Reportar una vulnerabilidad

No la publiques. Escribe al responsable del repositorio con la descripción, los
pasos para reproducirla y el impacto. Se responde en un máximo de 5 días hábiles.
