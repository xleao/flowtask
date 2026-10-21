# ADR-003: Dos motores con el mismo código: SQLite por defecto, PostgreSQL para uso real

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

El PDF recomienda SQLite por simplicidad, pero también acepta PostgreSQL. Un módulo interno para equipos necesita escrituras concurrentes y tipos de fecha con zona horaria.

## Decisión

El código solo usa SQL portable y funciona **igual** en los dos motores; se elige con `DATABASE_URL`.

- **SQLite** es el valor por defecto: quien revise el proyecto lo levanta sin instalar nada. La conexión se configura para uso web: claves foráneas activas, modo **WAL** (las lecturas no bloquean escrituras), `busy_timeout` (una escritura concurrente espera en vez de fallar) y un `lower()` Unicode para que la búsqueda ignore mayúsculas también con tildes ("área" encuentra "ÁREA"), como en PostgreSQL.
- **PostgreSQL 16** es el motor para uso real: lo usan Docker Compose y el CI, y es obligatorio en `production` (la app no arranca con SQLite ahí).
- Toda la suite de pruebas corre en **ambos** motores.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Solo SQLite | Bloquea la base completa en cada escritura: no sirve para un equipo usándola a la vez en producción. |
| Solo PostgreSQL | Obliga a quien revisa el proyecto a instalar y configurar un servidor de base de datos. |
| Funciones exclusivas de PostgreSQL (ENUM, arrays) | Rompería la compatibilidad con SQLite que pide el PDF. |

## Consecuencias

- ✅ Se revisa en una laptop sin instalar nada, y se despliega sobre PostgreSQL sin cambiar código.
- ✅ El CI detecta diferencias entre motores.
- ⚠️ SQLite escribe de a una petición por vez: suficiente para revisar y para equipos pequeños, no para producción.

## Referencias

`backend/app/database.py`, `backend/.env.example`, `tests/test_sqlite_file.py`, `.github/workflows/ci.yml`
