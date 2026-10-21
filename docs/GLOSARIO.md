# Glosario

| Término | Significado en FlowTask |
|---|---|
| **Tarea** | Actividad con título, fecha límite, estado y categoría |
| **Categoría** | Área o proyecto que agrupa tareas (Trabajo, Personal, Urgente, Proyectos) |
| **Estado** | `Pendiente`, `En Progreso` o `Completada` |
| **Abierta** | Tarea en `Pendiente` o `En Progreso` |
| **Vencida** | Tarea abierta cuya fecha límite ya pasó |
| **Para hoy** | Tarea abierta que vence hoy o ya venció (sección superior del tablero) |
| **Captura rápida** | Barra para crear una tarea con solo el título: va a la categoría visible, con fecha de hoy |
| **Resumen** | Conteos del tablero que entrega `GET /tasks/summary` |
| **Seed / semilla** | Carga inicial de categorías base (`python seed.py`); se puede repetir sin duplicar |
| **Migración** | Cambio versionado del esquema de la base con Alembic (`0001`, `0002`) |
| **Versión de tarea** | Número que sube en cada cambio; base del control de concurrencia |
| **ETag / If-Match** | Cabeceras HTTP: el servidor informa la versión (`ETag`) y el cliente exige que siga siendo esa (`If-Match`) |
| **Actualización optimista** | La interfaz muestra el cambio antes de que responda el servidor y lo revierte si falla |
| **request_id** | Identificador único de cada petición; une la respuesta con sus líneas de log |
| **Liveness / readiness** | `/health/live`: el proceso responde. `/health`: además, la base está disponible |
| **Modo ligero** | Variante de la interfaz sin animaciones de fondo, para equipos lentos |
| **TRON sereno** | Nombre del sistema visual: estética TRON calmada para uso diario |
| **ADR** | *Architecture Decision Record*: documento breve que registra una decisión, su contexto y sus consecuencias |
| **C4** | Modelo de diagramas de arquitectura en 4 niveles: contexto, contenedores, componentes y código |
| **Disco de identidad** | Botón circular de cada tarjeta que la completa o la reabre con un clic |
