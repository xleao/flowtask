# FlowTask — Diseño UX/UI

Sistema visual **"TRON sereno"**: la estética TRON (noche, cian, cuadrícula en
perspectiva, discos de identidad) adaptada a un equipo de operaciones, como el de
Sintad, que la usa varias horas al día en laptops corporativas.

Implementación: [`frontend/src/styles.css`](../frontend/src/styles.css). La base
TRON está arriba; al final, la capa **CONTEXTO SINTAD** la calma y la capa
**MODO LIGERO** la adapta a equipos lentos.

## 1. Principios

| Principio | Cómo se aplica |
|---|---|
| **Lo urgente se ve primero** | Las tareas se agrupan en *Para hoy y vencidas*, *Próximos días* y *Completadas*, en ese orden. La fecha se lee en lenguaje natural ("Vence hoy", "Mañana", "Vencida hace 2 días"). |
| **Un solo foco de movimiento** | Solo se mueven la cuadrícula del fondo (avanza una celda cada 120 s), el disco del logo (una vuelta cada 14 s) y el LED de conexión. Fuera de eso, el movimiento responde a una acción: abrir un modal, mostrar un aviso o completar una tarea. |
| **El color significa algo** | El cian marca lo accionable y lo seleccionado; el ámbar, lo de hoy; el rojo, lo vencido, lo urgente y lo destructivo; el celeste, lo completado. No hay color decorativo. |
| **Técnico, pero sin cansar la vista** | Bordes finos en lugar de resplandores neón, texto en tipo oración (sin MAYÚSCULAS) y contraste AA en todo el texto. |
| **Rápido incluso en equipos lentos** | Sin `backdrop-filter` ni `filter: blur`. Las animaciones solo usan `transform` y se apagan en el modo ligero. |

## 2. Paleta

Tema oscuro único: pensado para pantallas encendidas todo el día y coherente con la identidad TRON.

| Token | Hex | Uso |
|---|---|---|
| `--background` | `#02050B` | Fondo de la app |
| `--surface` | `#050D1C` | Base de tarjetas, sidebar y modales (con opacidad 0.86–0.97) |
| `--primary-container` | `#00F0FF` | Acento TRON: selección, foco, disco del logo, borde de tareas *En Progreso* |
| Botón principal | `#19D3E0` → hover `#4EE2EC` | "Nueva tarea", "Guardar". Cian sólido, sin degradado |
| `--secondary` | `#7BD0FF` | Tareas completadas y su contador |
| `--tertiary` | `#FED639` | "Para hoy" y "Vence hoy" |
| `--error` | `#FF4A5A` | Vencidas, categoría *Urgente*, eliminar, errores |
| `--on-surface` | `#DCE3F0` | Texto principal |
| `--on-surface-variant` | `#8CA4BB` | Texto secundario y descripciones |
| `--outline` | `#6F8BA3` | Texto terciario. Contraste 5.6:1 sobre el fondo (el valor original, `#4A6880`, daba ~3:1) |
| `--line` | `rgba(148,196,230,.12)` | Bordes de superficies en reposo |
| `--line-strong` | `rgba(0,240,255,.32)` | Bordes en hover y foco |

### Semántica de una tarjeta de tarea

| Situación | Borde izquierdo | Insignia de fecha |
|---|---|---|
| Vencida o categoría *Urgente* | Rojo | Rojo: "Vencida hace N días" |
| Vence hoy o *En Progreso* | Cian | Ámbar: "Vence hoy" |
| Próxima | Gris (`--outline`) | Cian: "Mañana", "En 3 días" o la fecha |
| Completada | Celeste (rojo si es *Urgente*) | Fecha relativa atenuada + insignia "Completada" |

## 3. Tipografía

Fuentes autoalojadas con `@fontsource`, sin Google Fonts: la CSP sigue siendo `'self'` y la app funciona sin internet.

| Fuente | Rol |
|---|---|
| **Inter Variable** | Todo el texto de la interfaz: títulos, tarjetas, formularios, botones y avisos |
| **Chakra Petch** (solo subconjunto latino, 400–700) | Únicamente la marca "FLOWTASK" (la única palabra en mayúsculas). Es la firma TRON |
| **JetBrains Mono Variable** | Números y datos: contadores y atajos de teclado (`Ctrl K`, `N`) |

Escala: título de vista 17 px · título de tarea 15 px · descripción 13 px ·
etiquetas 12–12.5 px · mínimo absoluto 11 px. Sin mayúsculas sostenidas ni tracking amplio.

## 4. Layout

```text
+--------------------+--------------------------------------------------------------------+
| (o) FLOWTASK       | Todas las tareas (12)   [ Buscar...   Ctrl K ]   [+ Nueva tarea]   |
|  Actividades del   |--------------------------------------------------------------------|
|  equipo            | Para hoy 3   Abiertas 8   Completadas 4 (Ver)   Estado [Todos v]   |
|--------------------| [+ Tarea rápida en "Trabajo", vence hoy ...          Añadir <-']   |
| CATEGORÍAS         |                                                                    |
| > Todas        12  | * Para hoy y vencidas (3) ---------------------------------------  |
|   Trabajo       5  | ( ) Preparar informe   [Vence hoy] [Trabajo]   [Pendiente v]  e x  |
|   Personal      2  |                                                                    |
|   Urgente       3  | * Próximos días (5) ---------------------------------------------  |
|   Proyectos     2  | ( ) Revisar contrato   [Mañana]    [Personal]  [Pendiente v]  e x  |
|                    |                                                                    |
|                    | * Completadas (4) --------------------------------------- Ocultar  |
|                    | (#) Enviar reporte     [Completada] [Trabajo]       Reabrir   e x  |
|--------------------|                                                                    |
| FT Espacio de      |--------------------------------------------------------------------|
|    trabajo         | 8 tareas abiertas       < Ant.   1 / 2   Sig. >      N  ·  Ctrl K  |
| * Conectado [z][r] |                                                                    |
+--------------------+--------------------------------------------------------------------+
```

| Símbolo | Significa | Símbolo | Significa |
|---|---|---|---|
| `(o)` | Disco del logo (gira) | `v` | Dropdown |
| `( )` | Completar con un clic | `e` / `x` | Editar / eliminar |
| `(#)` | Tarea completada (reabrir) | `[z]` / `[r]` | Modo ligero ⚡ / sincronizar ↻ |
| `*` | Indicador de sección o de conexión | `<-'` | Tecla Enter |

- **Sidebar fijo de 256 px**: marca, categorías con su contador (filtran vía backend) y estado de conexión con la API. Incluye el botón ⚡ para el modo ligero y ↻ para sincronizar.
- **Barra superior fija**: título de la vista, buscador y acción principal.
- **Contenido** con un ancho máximo de 1024 px para mantener líneas legibles.
- **Responsive (< 900 px)**: el sidebar pasa arriba y las categorías se muestran como una fila desplazable; el buscador ocupa todo el ancho y el formulario usa una sola columna.

## 5. Componentes

| Componente | Comportamiento clave |
|---|---|
| `Sidebar` | Categorías con conteo (`/tasks/summary`); "Urgente" en rojo; LED cian (pulsando) si la API responde y rojo fijo si no. |
| `SearchBox` | Busca en el backend (`?q=`) 300 ms después de la última tecla; `Ctrl/⌘ K` lo enfoca. Tiene estado propio: escribir no re-renderiza el tablero. |
| `FilterBar` | KPIs (para hoy, abiertas, completadas con Ver/Ocultar) y **dropdown** de estado (`<select>` nativo) con *Todos / Pendiente / En Progreso / Completada*. Cada cambio consulta `GET /tasks?status=…`; con un estado elegido, el control se marca en cian para que se note que la lista está filtrada. |
| `QuickCapture` | Escribir + Enter crea una tarea en la categoría visible (o la primera), con fecha de hoy y estado *Pendiente*. El placeholder dice a dónde va: nada se asigna "en silencio". Si falla, conserva el texto. |
| `TaskList` | Agrupa en secciones, muestra un skeleton al cargar y estados vacíos que proponen una acción ("Crear primera tarea", "Ver todas las tareas", "Ver completadas"). |
| `TaskCard` | Disco de identidad = completar/reabrir con un clic; selector de estado; editar y eliminar aparecen al pasar el mouse (siempre visibles en pantallas táctiles); las esquinas tácticas TRON aparecen en hover y foco. |
| `TaskForm` | Validación en vivo con las mismas reglas del backend. Atajos de fecha *Hoy / Mañana / En una semana*. Los errores 422 del backend aparecen bajo cada campo. |
| `Modal` / `ConfirmDialog` | `<dialog>` nativo: foco atrapado, `Esc` cierra. Eliminar siempre pide confirmación nombrando la tarea. |
| `Toasts` | Confirman cada acción con el mismo verbo del botón ("Tarea eliminada", "Tarea marcada como completada"). Los errores explican qué pasó y qué hacer. |
| `Pagination` | 12 tareas por página (`limit`/`offset`); si se borra la última tarea de una página, retrocede sola. |

## 6. Interacción y feedback

- **Optimista**: completar, cambiar el estado o eliminar se ve al instante y se revierte con un aviso si el backend falla.
- **Sin recargar**: todo cambio se refleja en la lista y en los contadores.
- **Atajos**: `N` abre "Nueva tarea" y `Ctrl/⌘ K` enfoca el buscador.
- **Errores de red**: "No se pudo conectar con el servidor. Verifica que el backend esté en ejecución." Hay un bloque de error con "Reintentar" y el LED del sidebar pasa a rojo. Timeout de 10 s por petición.
- **Redacción**: tipo oración, verbos concretos y el mismo nombre de acción en todo el flujo. Los estados vacíos invitan a actuar en lugar de solo informar.

## 7. Accesibilidad

- Contraste AA en todo el texto (el gris terciario se subió a `#6F8BA3`).
- Todo es operable con teclado: `<dialog>` nativo, foco visible y botones con `aria-label` que nombran la tarea ("Completar «Preparar informe»").
- `aria-pressed` en el disco de completar y `aria-busy` en la lista mientras carga; los errores de campo usan `role="alert"` y `aria-describedby`.
- `prefers-reduced-motion` detiene todas las animaciones.

## 8. Rendimiento en equipos lentos

| Medida | Efecto |
|---|---|
| Sin `backdrop-filter` ni `filter: blur` | Era lo más costoso en gráficos integrados: se recalculaba en cada cuadro y para cada tarjeta. |
| Las animaciones solo usan `transform` | Las resuelve la GPU sin repintar (cuadrícula y disco del logo). |
| Halos como `radial-gradient` | Se pintan una sola vez. |
| Transiciones de propiedades concretas, nunca `all` | Menos trabajo en cada hover. |
| Buscador y captura rápida con estado propio | Teclear no re-renderiza la lista. |
| Fuentes autoalojadas; Chakra solo en subconjunto latino | CSS de 46 KB → **10.7 KB gzip**; JS **57 KB gzip**. |
| **Modo ligero** (`html.perf-lite`) | Se activa solo si el equipo tiene ≤ 4 núcleos o ≤ 4 GB de RAM, ahorro de datos, "reducir movimiento", o si se miden menos de 40 FPS al cargar (con un aviso). Oculta la cuadrícula 3D, detiene el disco y anula las transiciones. Se cambia con ⚡ y la preferencia se recuerda. |

## 9. Qué se descartó y por qué

En el diseño TRON original había rayos de luz recorriendo la pantalla, scanlines,
halos de color, corchetes `[ ]` en botones y campos, puntos que pulsaban y textos
en MAYÚSCULAS con tracking amplio. Daban impacto en la primera impresión, pero
competían con las tareas por la atención y costaban rendimiento. Se conservó solo
lo que identifica a TRON sin estorbar: la cuadrícula, el cian, el disco y las
esquinas tácticas (que ahora solo aparecen sobre la tarjeta activa).
