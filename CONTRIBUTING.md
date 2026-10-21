# Guía de desarrollo

Convenciones para trabajar en FlowTask manteniendo la calidad actual. Para levantar el proyecto, ver el [README](README.md).

## Antes de dar un cambio por terminado

```bash
# Backend
cd backend
ruff check . && ruff format --check .
mypy .
pytest                       # cobertura mínima 90 %

# Frontend
cd frontend
npm run build                # incluye tsc en modo estricto
```

El CI (`.github/workflows/ci.yml`) corre exactamente estos mismos pasos.

## Convenciones del backend

- Respeta las capas ([ADR-001](docs/adr/001-arquitectura-en-capas.md)): el router no consulta la base; el
  repositorio no hace `commit`; el servicio no importa FastAPI.
- Los errores de negocio se lanzan como `NotFoundError`, `BusinessRuleError` o `PreconditionFailedError`;
  nunca `HTTPException` desde un servicio.
- Todo cambio de modelo lleva su migración: `alembic revision --autogenerate -m "..."`, revisada a mano.
  `test_migrations_match_models` falla si se olvida.
- Cada regla nueva lleva su prueba en `backend/tests/`.
- Tipado completo: `mypy --strict` sin `Any` ni `type: ignore` nuevos.

## Convenciones del frontend

- El HTTP vive solo en `src/services/`; los componentes reciben props y emiten eventos.
- Tipos en `src/types/models.ts`, alineados con los esquemas del backend. Sin `any`.
- Estilos en `styles.css` siguiendo [DISENO_UI.md](docs/DISENO_UI.md): usa los tokens de color, no hex nuevos;
  anima solo `transform`/`opacity`; nunca `transition: all` ni `backdrop-filter`.
- Textos en español, en tipo oración, con el mismo verbo en botón y aviso ("Eliminar tarea" → "Tarea eliminada").

## Decisiones de arquitectura

Si un cambio altera una decisión registrada o toma una nueva de peso (una dependencia, un
patrón, un cambio de contrato), agrega un ADR en `docs/adr/` con el siguiente número y
enlázalo en el índice. Si reemplaza a otro, marca el anterior como **Reemplazada**.

## Documentación

Actualiza junto con el cambio lo que este afecte: [API](docs/API.md), [requerimientos](docs/REQUERIMIENTOS.md)
y, si es una decisión de peso, un ADR nuevo.
