# Documentación de FlowTask

Mapa de toda la documentación del proyecto. Cada documento tiene un propósito y un público.

## Por dónde empezar

| Si quieres… | Lee |
|---|---|
| Levantar el proyecto en 5 minutos | [README principal](../README.md) |
| Revisar la prueba técnica contra el PDF | [README · tabla de casos](../README.md) → [Plan de pruebas · trazabilidad](PRUEBAS.md#5-matriz-de-trazabilidad-pdf--prueba) |
| Entender por qué está hecho así | [Decisiones (ADR)](adr/README.md) |
| Integrarte con la API | [Referencia de la API](API.md) |

## Catálogo

| Documento | Contenido | Público |
|---|---|---|
| [REQUERIMIENTOS.md](REQUERIMIENTOS.md) | Actores, requerimientos funcionales (RF) y no funcionales (RNF), reglas de negocio (RN), criterios Gherkin, alcance | Producto, QA, desarrollo |
| [ARQUITECTURA.md](ARQUITECTURA.md) | C4 (contexto, contenedores, componentes, código, despliegue), modelo de datos, flujos, concurrencia, migraciones | Desarrollo, arquitectura |
| [adr/](adr/README.md) | 20 registros de decisiones de arquitectura (contexto, decisión, alternativas, consecuencias) | Desarrollo, liderazgo técnico |
| [API.md](API.md) | Endpoints, modelos, parámetros, ejemplos, errores y cabeceras | Frontend, integradores |
| [DISENO_UI.md](DISENO_UI.md) | Sistema visual "TRON sereno": principios, paleta, tipografía, layout, componentes, accesibilidad, rendimiento | Diseño, frontend |
| [PRUEBAS.md](PRUEBAS.md) | Estrategia, suite, matriz PDF → prueba, pruebas manuales, criterios de salida | QA, desarrollo |
| [SEGURIDAD.md](SEGURIDAD.md) | Modelo de amenazas STRIDE, controles por capa, riesgos aceptados | Seguridad, revisión |
| [OPERACION.md](OPERACION.md) | Variables de entorno, puertos, Docker, salud, logs, respaldos, solución de problemas | Operaciones, soporte |
| [GLOSARIO.md](GLOSARIO.md) | Términos del dominio y técnicos | Todos |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Convenciones de desarrollo y verificaciones antes de terminar un cambio | Desarrollo |

## Convenciones de esta documentación

- En español, en tipo oración, y con el código como fuente de verdad: si algo no coincide, manda el código y se corrige el documento.
- Los diagramas usan **Mermaid** (GitHub los muestra sin herramientas extra).
- Los identificadores (`RF-05`, `RN-11`, `ADR-008`) son estables y se pueden citar entre documentos y en el código.
- Toda decisión nueva de peso se registra como ADR ([cómo](../CONTRIBUTING.md#decisiones-de-arquitectura)).
