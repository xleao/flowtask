# FlowTask — Manual de operación

Cómo configurar, arrancar, vigilar, respaldar y diagnosticar FlowTask. Para la instalación
desde cero, ver el [README](../README.md).

## 1. Configuración

### Backend (`backend/.env`)

Todas las variables tienen un valor por defecto en `app/core/config.py`.

| Variable | Por defecto | Descripción |
|---|---|---|
| `ENVIRONMENT` | `development` | `development`, `test` o `production`. En `production` se apagan `/docs` y la app se niega a arrancar con configuración permisiva |
| `DATABASE_URL` | `sqlite:///./flowtask.db` | SQLite (sin instalar nada) o PostgreSQL: `postgresql+psycopg://usuario:clave@host:5432/base`. Mismo código para ambos |
| `DB_STATEMENT_TIMEOUT_MS` | `5000` | PostgreSQL: corta consultas lentas. SQLite: espera máxima de una escritura concurrente |
| `CORS_ORIGINS` | `http://localhost:5180,http://127.0.0.1:5180` | Orígenes exactos del frontend, separados por coma. Se validan al arrancar. En `development` se acepta además `localhost`/`127.0.0.1` en cualquier puerto |
| `ALLOWED_HOSTS` | `*` | Valores aceptados en la cabecera `Host`. En producción, el dominio real |
| `RATE_LIMIT` | `120/minute` | Límite por IP |
| `RATE_LIMIT_ENABLED` | `true` | Desactivar solo para pruebas de carga |
| `RATE_LIMIT_STORAGE_URI` | `memory://` | Con varios workers: `redis://host:6379/0` |
| `INIT_DB_ON_STARTUP` | `true` | Migra y siembra al arrancar (lo mismo que `python seed.py`) |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LOG_FORMAT` | `text` | `text` (legible) o `json` (una línea por evento) |

### Frontend (`frontend/.env`)

| Variable | Por defecto | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8010` | URL base de la API en desarrollo. En Docker no se usa: Nginx redirige `/api` |

### Docker Compose

| Variable | Por defecto | Descripción |
|---|---|---|
| `POSTGRES_PASSWORD` | `flowtask` | Contraseña de la base. **Cámbiala** fuera de un entorno local: `POSTGRES_PASSWORD=… docker compose up -d` |

## 2. Puertos

| Servicio | Local | Docker |
|---|---|---|
| Frontend | `5180` (Vite; si está ocupado, el siguiente) | `8080` (Nginx) |
| API | `8010` | `127.0.0.1:8010` (solo esta máquina) |
| Base de datos | SQLite (archivo `backend/flowtask.db`) o PostgreSQL `5432` | PostgreSQL sin publicar (red interna) |

## 3. Operación con Docker

```bash
docker compose up -d --build          # construir y levantar en segundo plano
docker compose ps                     # estado y salud de cada servicio
docker compose logs -f backend        # seguir los logs de la API
docker compose restart backend        # reiniciar un servicio
docker compose down                   # apagar (los datos se conservan)
docker compose down -v                # apagar y BORRAR la base de datos
```

Orden de arranque garantizado por healthchecks: `db` sano → `backend` migra, siembra y
responde `/health` → `frontend`.

## 4. Salud y monitoreo

| Endpoint | Uso | Respuesta sana |
|---|---|---|
| `GET /health/live` | Liveness: ¿el proceso responde? | `200` |
| `GET /health` | Readiness: ¿hay base y el esquema está al día? | `200 {"status":"ok","database":"ok","schema":"0002","version":"1.1.0"}` |

Si `/health` responde `503`, la API está viva pero no llega a la base de datos.

## 5. Logs

- Cada request deja una línea con método, ruta, estado, duración y `request_id`.
- Con `LOG_FORMAT=json` (el valor que usa Docker) cada línea es JSON:
  `{"ts": "...", "level": "INFO", "msg": "...", "request_id": "...", "status": 200, "duration_ms": 4.1}`.
- **Para investigar un error que reporta un usuario:** el cuerpo de un `500` y la cabecera
  `X-Request-ID` traen el identificador. Búscalo así:

```bash
docker compose logs backend | grep "<request_id>"
```

## 6. Base de datos

### Migraciones

```bash
cd backend
alembic current            # revisión aplicada
alembic upgrade head       # aplicar pendientes
alembic downgrade -1       # revertir la última
alembic history            # 0001 (esquema inicial) → 0002 (version)
```

Una base creada antes de Alembic se detecta y se adopta sola al correr `python seed.py`.

### Respaldo y restauración (Docker)

```bash
# Respaldo
docker compose exec -T db pg_dump -U flowtask flowtask | gzip > flowtask_$(date +%F).sql.gz

# Restauración (sobre una base vacía)
gunzip -c flowtask_2026-10-21.sql.gz | docker compose exec -T db psql -U flowtask flowtask
```

## 7. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `python seed.py` falla con `connection refused` | `DATABASE_URL` apunta a PostgreSQL y no está corriendo | Inícialo, o vuelve a SQLite: `DATABASE_URL=sqlite:///./flowtask.db` en `backend/.env` |
| Quiero empezar de cero con SQLite | — | Detén la API y borra `backend/flowtask.db*`; `python seed.py` la recrea |
| `password authentication failed for user "flowtask"` | No se creó el usuario | Ejecuta el `CREATE USER` / `CREATE DATABASE` del README |
| La app muestra "No se pudo conectar con el servidor" | La API no corre o `VITE_API_URL` apunta mal | Revisa `http://localhost:8010/health` y `frontend/.env` |
| Error de CORS en la consola del navegador | El frontend no se abre desde `localhost`/`127.0.0.1` (p. ej. desde la IP de la red), o `ENVIRONMENT` no es `development` | Ábrelo desde `localhost`, o agrega el origen exacto a `CORS_ORIGINS`. El log de arranque de la API lista los orígenes permitidos |
| La API no arranca: `CORS_ORIGINS inválido` | Un origen con ruta o sin esquema (`localhost:5180`, `http://host/app`) | Usa el formato `http(s)://host[:puerto]`; la barra final se corrige sola |
| `400 Invalid host header` | `ALLOWED_HOSTS` no incluye el host usado | Agrégalo a `ALLOWED_HOSTS` |
| `429 Too Many Requests` | Se superó el límite por IP | Espera lo que indique `Retry-After` o sube `RATE_LIMIT` |
| `412` al editar | Otra persona cambió la tarea antes | Recarga la tarea y vuelve a aplicar el cambio |
| `docker` no se reconoce (Windows) | Docker Desktop instalado por usuario y la terminal es anterior | Abre una terminal nueva o inicia Docker Desktop |
| El backend de Docker queda `unhealthy` | La base no responde o falló la migración | `docker compose logs backend db` |
| La interfaz va lenta en un equipo modesto | Animaciones de fondo | Botón ⚡ del sidebar (modo ligero); se recuerda la preferencia |
