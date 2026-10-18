# Mercadobra

Plataforma uruguaya para descubrir, cotizar y comprar productos para obra, con experiencias separadas para clientes, proveedores y administradores.

**Producción:** <https://mercadobra.com>

**Backend:** <https://mercadobra.onrender.com>

**Última actualización:** 16 de octubre de 2026

El estado funcional detallado y las prioridades se mantienen también en [docs/ESTADO_WEB.md](docs/ESTADO_WEB.md).

## Estado actual

La plataforma se encuentra operativa con:

- Frontend React + Vite desplegado en Vercel (<https://mercadobra.com>).
- Backend Express desplegado como Web Service en Render (<https://mercadobra.onrender.com>).
- PostgreSQL en Render como base de datos de producción relacional y transaccional.
- **Plataforma OxI (Portal B2B para Constructoras & Estudios):**
  - **OxI Clásico:** Solicitud y seguimiento de cotizaciones de herrería y obra, carga clasificada de documentación técnica (planos CAD/PDF, memorias, fotos de obra), tablero Kanban en vivo de 5 etapas y mensajería directa con ingeniería.
  - **OxI Pro Suite (Los 4 Pilares de Control de Obra):**
    - *Pilar 1 (Proyectos):* Conmutador directo de obras en cabecera con persistencia reactiva, visualización de dirección y vinculación estricta en base de datos (`b2b_project_id`).
    - *Pilar 2 (Schedule Gantt):* Cronograma interactivo con cálculo dinámico de días hábiles, mano de obra estimada por cuadrilla y categoría laboral, badges de estado en vivo (`✓ Terminado`, `⚡ En curso`, `⏳ Pendiente`) y descarga a Excel con `📥 Exportar Cronograma (CSV)`.
    - *Pilar 3 (Presupuestos & Costos):* Partidas presupuestarias editables y personalizadas (`＋ Agregar Rubro / Partida`), alertas de sobrecosto por rubro (Normal, Advertencia $\ge 85\%$, Crítico $> 100\%$), comparativa semanal (% Real vs P0) y descarga con `📥 Exportar Balance (CSV)`.
    - *Pilar 4 (Gestor Documental):* Selector drag-and-drop con lectura real Base64 y cálculo de peso, descargas directas (`⬇ Descargar`), modal de nuevas iteraciones (`+ Iteración`) y soporte ampliado en backend para formatos técnicos (.dwg, .dxf, .cad, .pdf, .docx, .xlsx, imágenes) hasta 15 MB.
  - **Gestión de niveles:** Conmutador de plataforma en la barra lateral, control y asignación administrativa de tiers (`classic` / `pro`) y solicitud directa de habilitación a Pro desde modal interactivo en 1 clic.
- **OXI Network (Marketplace de Fabricación Distribuida):**
  - Adjudicación de piezas y proyectos desde el espacio de cotización administrativo (`/admin/cotizaciones/:id`) a talleres asociados homologados con precio objetivo, moneda y fecha límite.
  - Panel operativo de taller en `/proveedor` (`SupplierDashboard.jsx`): recepción de órdenes, transiciones de estado (`pending` -> `accepted` -> `in_progress` -> `ready` -> `delivered`), slider de avance en tiempo real (0–100%) y notas técnicas de taller.
- **Exportación Comercial OXI PDF & Conversión a Cotización Oficial:**
  - Generador de presupuestos oficiales en PDF de 2 páginas (`POST /admin/costing/pdf`) con identidad institucional, portada ejecutiva, desglose de costos y datos de pago.
  - Conversión directa de costeo paramétrico a cotización oficial del cliente en 1 clic (`POST /admin/costing/convert-to-quote`).
- **Administración Integral de Clientes (`/admin/clientes`):**
  - Control de accesos y asignación de nivel (Classic / Pro).
  - Sistema de invitaciones directas por token criptográfico (`/invitacion/:token`) con reenvío, copiado al portapapeles y expiración.
  - Exportación e importación masiva mediante CSV.
  - Eliminación en cascada segura (sin conflictos de foreign keys en PostgreSQL).
- **Constructor Visual de Plantillas Paramétricas (`/admin/plantillas`):**
  - Creación visual de fórmulas matemáticas y recetas paramétricas para costeo de familias de productos sin editar código ni base de datos.
- **Motor de Costeo OXI Quote & Auditoría IA (`/admin/cotiza`):**
  - Motor determinístico de costos con 81+ variables de costos versionadas, cálculo de materiales, mano de obra, flete y tipo de cambio oficial BROU.
  - Auditor financiero con Inteligencia Artificial para detectar desvíos y anomalías en ratios de consumo y desperdicio.
- **Panel de Analítica Ejecutiva (`/admin/analytics`):**
  - Tableros gráficos (Recharts) con seguimiento de GMV, tasas de conversión, distribución de etapas de cotización y ventas.
- **OXI Modela (Simulador 3D en Navegador):**
  - Modelador paramétrico 2D/3D con Three.js, estimación de costos en tiempo real, catálogo de aberturas/muebles y asistente con IA.
- **E-commerce B2C & B2B:** Catálogo, carrito persistente, checkout con Mercado Pago, órdenes con snapshot inmutable y cuentas de taller para proveedores.
- **Cuentas Demo & Resiliencia:** Inicialización idempotente en arranque con usuarios demo (`admin`, `proveedor`, `cliente`, `pro`) y botones de quick-fill en pantallas de acceso.

## Accesos de la plataforma

| Perfil / Módulo | Ruta | Uso |
| --- | --- | --- |
| **Cliente (OxI Clásico & Pro)** | `/cliente/login` o `/cliente` | Portal de obras, cotizaciones, planos con versiones, Gantt y Curva S. |
| **Aceptación de Invitación** | `/invitacion/:token` | Activación de cuenta por enlace único enviado por administración. |
| **Registro público** | `/cliente/registro` | Alta de clientes para e-commerce y cotizaciones. |
| **Proveedor / Taller** | `/proveedor/login` | Acceso profesional y gestión de catálogo y órdenes de taller. |
| **Panel de Administración** | `/admin/login` | Consola central de productos, pedidos, cotizaciones y clientes. |
| **Gestión de Clientes B2B** | `/admin/clientes` | Control de niveles OxI, invitaciones, exportación CSV y fichas de obra. |
| **Constructor de Plantillas** | `/admin/plantillas` | Diseñador visual de fórmulas y parámetros de productos OXI. |
| **Cotizador OXI Quote** | `/admin/cotiza` | Costeo paramétrico con variables versionadas y auditor IA. |
| **Analítica Comercial** | `/admin/analytics` | KPIs de proyectos, GMV, embudo de conversión y ventas. |
| **Simulador 3D (OXI Modela)** | `/admin/modelador` | Diseño paramétrico 2D/3D con estimación económica en vivo. |

## Visión Estratégica: OXI Platform

El objetivo a largo plazo de Mercadobra y Óxida es trascender el modelo lineal de fabricación para convertirse en una **plataforma escalable de soluciones metálicas para la construcción (ConstructionTech)**. 

La propuesta de valor central se basa en un modelo donde el cliente (constructoras, desarrolladores, estudios) define su necesidad, y la plataforma OXI cotiza, diseña, asigna fabricación, controla calidad y coordina instalación.

Para lograr un modelo de negocio altamente escalable y atractivo, el ecosistema se proyecta sobre 5 pilares:

1. **OXI Quote (Cotizador Inteligente):** Motor interno que procesa requerimientos, planos o descripciones para identificar productos, estimar materiales, horas, costos de proveedores y logística. Genera cotizaciones precisas de forma instantánea y alimenta un activo de datos históricos de costos.
2. **Productización (Catálogo Paramétrico):** Estandarizar el 60-70% de la oferta a medida en familias parametrizables (OXI Doors, Dividers, Rail, etc.). Permite vender soluciones que el cliente percibe como personalizadas, operando sobre una arquitectura de fabricación repetible.
3. **OXI Network (Red de Fabricación Distribuida):** Una plataforma (Marketplace de proveedores) que conecta la demanda con una red descentralizada de fabricantes, herreros e instaladores homologados. OXI adjudica trabajos basándose en precio, capacidad y calidad histórica, escalando la producción sin multiplicar la estructura fija.
4. **OXI Partner (Metal Solutions as a Service):** Contratos B2B con constructoras para funcionar como proveedor transversal. Al entrar un edificio, la plataforma analiza planos, identifica todos los paquetes metálicos y gestiona su ejecución completa (desde la ingeniería hasta la garantía).
5. **OXI OS (SaaS para Construcción):** Apertura de la tecnología para que las constructoras puedan cargar un plano y obtener automáticamente detección de elementos, estimaciones, solicitud de presupuestos (RFQ) a proveedores y seguimiento de ejecución.

**Estrella Norte (North Star Metric):** En lugar de medir solo la facturación aislada, el objetivo es maximizar el **GMV (Gross Merchandise Value) anual gestionado**, capturando valor a través del margen de proyectos, fee de red de fabricación y contratos recurrentes.

### 🚀 Ejes de Innovación Disruptiva (De Software Administrativo a Plataforma ConstructionTech)

Para trascender el modelo de un simple ERP administrativo y convertir a Mercadobra / Óxida en un ecosistema ConstructionTech de clase mundial (inspirado en referentes globales como Xometry, Procore y Kojo), la plataforma orienta su desarrollo hacia dos grandes frentes de inteligencia artificial y automatización operativa:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DOS PILARES DISRUPTIVOS CON IA                                  │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│  1. COTIZADOR INTELIGENTE DE PIEZAS OXI   │  2. AUTO-ONBOARDING DE PROYECTO / OBRA     │
│  (Del requerimiento o croquis al precio)  │  (De la carpeta del arquitecto a OxI Pro)  │
│                                           │                                            │
│  • Entrada: texto, plano o croquis.       │  • Entrada: memorias, pliegos, planos PDF. │
│  • IA extrae medidas, perfiles y kilos.   │  • IA clasifica y versiona los documentos. │
│  • Calcula costo con motor OXI Quote.     │  • Auto-genera el Cronograma Gantt.        │
│  • Genera propuesta comercial y PDF.      │  • Auto-genera la Planilla de Rubros ($).  │
│  • Redacción lista para el cliente.       │  • Detecta paquetes metálicos a cotizar.   │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

#### Tarea A: Cotización Inteligente Automatizada de Piezas & Soluciones OXI (*AI Quoting Engine*) — **[OPERATIVO]**
* **Objetivo:** Pasar de 5 días de espera presupuestaria a 45 segundos, eliminando la fricción de costeo manual.
* **Mecánica Implementada:**
  - **Recepción Multimodal & Asistencia en Vivo:** El cliente (arquitecto o constructora) escribe su solicitud en lenguaje natural, adjunta bocetos o sube un plano técnico (PDF / CAD / imagen). Puede validar su memoria técnica en tiempo real con IA (`✨ Validar memoria técnica con IA`) antes de enviar, detectando medidas y faltantes de información.
  - **Extracción de Variables:** En la consola de cotización (`/admin/cotizaciones/:id`), el modelo de IA extrae y normaliza las dimensiones (largo, ancho, alto), tipos de perfiles requeridos, metros lineales, peso estimado de acero ($\text{kg}$), horas de taller de soldadura/corte, superficie de pintura electrostática ($\text{m}^2$) y sugiere la plantilla paramétrica correspondiente (`OXI_RAILING_R01`, `OXI_PERGOLA_P01`, `OXI_DIVIDER_D01`, `MESA_CIRCULAR_001`).
  - **Cálculo Determinístico con OXI Quote en 1 Clic:** Botón directo `⚡ Cotizar en OXI Quote con 1 clic` que precarga las variables extraídas en `/admin/cotiza`, conectándolas a las tablas de costos versionadas (`cost_variables`, `cost_variable_versions`), margen comercial y tipo de cambio BROU.
  - **Volcado Automático a la Cotización Comercial:** Botón `⚡ Aplicar a Cotización #${quoteId}` (`POST /admin/costing/apply-to-quote`) que traslada el precio total calculado en USD, el desglose de partidas técnicas y la descripción ejecutiva directamente a la ficha del cliente.
  - **Generación de Propuesta y PDF:** Redacción asistida con IA (`✨ Redactar con IA`), auditoría financiera de rentabilidad (`🤖 OXI AI Auditor`) y emisión del presupuesto oficial en PDF de 2 páginas listo para firmar y aprobar.

#### Tarea B: Automatización Integral del Proyecto de la Constructora (*AI Project Ingestion & Onboarding*)
* **Objetivo:** Cero carga manual: transformar la carpeta desordenada de la constructora en la Suite OxI Pro 100% poblada.
* **Mecánica:**
  - **Carga Masiva de Documentación:** La constructora arrastra su carpeta de obra (memorias descriptivas, pliegos de condiciones técnicas, planos de arquitectura, detalles y planillas de cálculo).
  - **Clasificación y Versionado Inteligente:** El agente clasifica automáticamente cada archivo en su categoría correspondiente (`Planos`, `Certificaciones`, `Seguridad y Salud`, `Especificaciones`) y le asigna la versión base `v1.0`.
  - **Auto-Generación del Cronograma Gantt:** La IA lee los plazos y etapas descritas en la memoria técnica y genera el cronograma de obra completo (Fundaciones, Estructura de Hormigón, Albañilería, Herrería de Fachada Óxida, Instalaciones y Terminaciones) con fechas estimadas y asignación sugerida de cuadrillas por categoría salarial.
  - **Auto-Generación del Balance Presupuestario por Rubro:** Estima los montos autorizados por especialidad según los metros cuadrados construidos y tipología edilicia, activando el semáforo de sobrecosto.
  - **Detección Proactiva de Paquetes Metálicos Óxida:** Identifica todas las partidas de herrería que la obra requerirá (barandas de balcón, escaleras presurizadas de escape, pérgolas, parasoles, marcos) y genera automáticamente los borradores de cotización listos para cotizar en el sistema.

#### Funcionalidades de Soporte Técnico y Fabricación:
* **Configurador 3D Paramétrico para Clientes:** Modelado 3D interactivo en navegador para familias estandarizadas (Pérgolas, Barandas, Escaleras caracol, Cerramientos tipo loft) con sliders de medidas, recálculo de precio en tiempo real y pedido directo de fabricación.
* **Optimizador de Listas de Corte (1D Nesting):** Algoritmo de optimización sobre barras estándar de 6 metros para reducir el desperdicio del taller al $< 5\%$, emitiendo planillas de corte en PDF con códigos QR por pieza para la red OXI Network.
* **Certificaciones Móviles de Obra con Fotos Georreferenciadas:** Interfaz móvil para que directores de obra y capataces certifiquen avances en sitio con GPS, timestamp inmutable y firma táctil, liberando pagos e hitos al taller.

### Roadmap Comercial y de Desarrollo (90 Días)

Para materializar esta visión técnica y comercial, el enfoque de desarrollo prioriza:

1. **Estructurar la Lógica de OXI Quote (Back-end):** 
   Crear los endpoints en Node.js que permitan cotizar cualquier requerimiento multiplicando cantidades (kg, horas) por la tabla de variables de costos (`cost_variable_versions`). Esto otorga flexibilidad para cotizar estándar o a medida sin atarse a un catálogo fijo.
2. **Conexión de OXI Modela con el Motor de Costos:** 
   Transformar el simulador 3D de una herramienta geométrica a una herramienta de viabilidad financiera. Al dibujar muros y aberturas, la plataforma debe estimar costos en tiempo real basados en la lógica de OXI Quote.
3. **El Portal B2B (Dashboard de Constructoras / OXI Partner):** 
   Desarrollar una interfaz dedicada para clientes corporativos donde puedan visualizar sus proyectos en curso (ej. edificios), subir planos, y monitorear el estado de ingeniería, fabricación e instalación de todas sus soluciones metálicas con total transparencia.
4. **OXI Network (Desarrollo de Proveedores):** 
   Ampliar el dashboard de proveedores existente para manejar RFQs (solicitudes de presupuesto) y asignaciones de trabajo a herreros u oficios homologados, descentralizando la producción.

### Backlog de Ejecución (OXI Platform)

Esta es la lista ordenada de tareas accionables para completar la transición a plataforma:

#### 1. Landing OXI Partner (B2B)
- [x] Crear ruta y carátula pública `/partner` diseñada para estudios y constructoras.

#### 2. Motor OXI Quote (Backend)
- [x] Base de datos de costos variables (`cost_variables`, `cost_variable_versions`).
- [x] Servicio de costeo matemático en Node (`costingService.js`, `costCalculator.js`).
- [x] Crear endpoint de API (`POST /admin/quote/calculate`) para exponer el servicio a las interfaces.
- [x] Construir motor de plantillas paramétricas con evaluador de fórmulas dinámicas (`src/pages/AdminTemplates.jsx` y backend).

#### 3. Interfaz OXI Quote & Propuestas Comerciales
- [x] Desarrollar la pantalla del cotizador manual interno (`/admin/cotiza`) conectada al endpoint.
- [x] Auditor financiero con IA en `/admin/cotiza` para auditar consumos, desperdicios y alertar anomalías.
- [x] Generador de presupuestos oficiales en PDF de 2 páginas (`POST /admin/costing/pdf`) con identidad OXI Partner y carátula profesional.
- [x] Conversión directa de costeo paramétrico a cotización oficial de cliente (`POST /admin/costing/convert-to-quote`).

#### 4. Integración con OXI Modela (Simulador 3D)
- [x] Interceptar la selección de elementos en el lienzo 3D (muros, aberturas) para enviarlos a la API de `OXI Quote`.
- [x] Mostrar en un panel lateral el costo estimado (USD) en tiempo real al diseñar.

#### 5. Portal Dashboard B2B (OXI OS — Plataforma OxI & OxI Pro)
- [x] Crear modelo de datos `b2b_projects` (Obras/Edificios vinculados a un cliente corporativo y cotizaciones con `b2b_project_id`).
- [x] Crear rol y portal unificado para clientes corporativos (Constructoras / Estudios).
- [x] **Plataforma OxI Clásico:**
  - [x] Pantalla "Mis Obras": listado de edificios en curso, selectores y creación de obras.
  - [x] Solicitud de cotización enriquecida con categorización de archivos (planos CAD/PDF, memorias, fotos de obra).
  - [x] Tablero Kanban interactivo con 3 columnas de avance (Solicitadas, En Proceso, Finalizadas).
  - [x] Barra de trazabilidad de 5 etapas (Solicitud -> Cotizada -> Aceptada -> En ejecución -> Finalizada).
  - [x] Mensajería técnica en tiempo real por cotización con el equipo de ingeniería.
- [x] **Suite OxI Pro (Los 4 Pilares de Control de Obra):**
  - [x] **Pilar 1 — Proyectos:** Conmutador directo de obras en el encabezado de OxI Pro, aislamiento de estado, visualización de dirección y recarga reactiva.
  - [x] **Pilar 2 — Cronograma Gantt & Recursos:** Plazos, cálculo dinámico de días hábiles y mano de obra por operario/categoría, pills de estado (`✓ Terminado`, `⚡ En curso`, `⏳ Pendiente`) y exportación a Excel con `📥 Exportar Cronograma (CSV)`.
  - [x] **Pilar 3 — Presupuestos vs. Ejecutados & Curva S:** Partidas personalizables (`＋ Agregar Rubro / Partida`), edición de base vs. ejecutado, cálculo de desviaciones, alertas de sobrecosto (normal, advertencia $\ge 85\%$, crítico $> 100\%$), comparativa semanal (% Real vs P0) y descarga con `📥 Exportar Balance (CSV)`.
  - [x] **Pilar 4 — Gestor Documental & Planos:** Selector drag-and-drop de archivos reales (`.dwg`, `.dxf`, `.cad`, `.pdf`, `.docx`, `.xlsx`, imágenes) hasta 15 MB, botón de descarga directa (`⬇ Descargar`) en cada fila, modal estructurado de nuevas iteraciones (`+ Iteración`) y registro de historial cronológico de cambios.
- [x] Conmutador de plataforma en la barra lateral con control de nivel (Classic vs Pro).
- [x] Solicitud de habilitación directa a OxI Pro en 1 clic con confirmación visual sin confusión con cotizaciones de herrería.
- [x] Control administrativo de asignación de nivel desde `/admin/clientes`.

#### 6. Constructor de Plantillas Paramétricas (Visual Builder)
- [x] Pantalla `/admin/plantillas` para construir visualmente nuevas plantillas de productos.
- [x] Definición dinámica de inputs (números, selecciones, checkboxes, medidas).
- [x] Editor interactivo de fórmulas matemáticas de costeo.

#### 7. Analítica y Gestión de Clientes
- [x] Dashboard ejecutivo `/admin/analytics` con métricas de GMV, embudo de cotizaciones y ventas.
- [x] Gestión de clientes con invitaciones seguras por token (`/invitacion/:token`), reenvío y copiado al portapapeles.
- [x] Eliminación en cascada segura de clientes en PostgreSQL.
- [x] Exportación e importación masiva de clientes en formato CSV.
- [x] Cuentas demo y botones de quick-fill en pantallas de login.

#### 8. OXI Network (Marketplace de Fabricación Distribuida)
- [x] Esquema relacional de órdenes de fabricación distribuida (`fabrication_orders`) en PostgreSQL y repositorio JSON.
- [x] Sistema de adjudicación en `/admin/cotizaciones/:id`: asignación de piezas y proyectos a talleres homologados con precio objetivo, moneda y plazo.
- [x] Dashboard operativo de taller en `/proveedor` (`SupplierDashboard.jsx`): recepción de órdenes, transiciones de estado (`pending` -> `accepted` -> `in_progress` -> `ready` -> `delivered`), slider de avance en tiempo real (0–100%) y notas técnicas de taller.
- [x] Trazabilidad y visibilidad bidireccional entre la administración de Óxida y los talleres fabricantes.

#### 9. Hoja de Ruta Inmediata (Ingeniería & Control de Obra OxI Pro)
- [x] **Paso 1 — Leyes Sociales por Rubro (Pestaña 4):** Desglose paramétrico por rubro/especialidad de Mano de Obra, Leyes Sociales (BPS ~65%), Materiales/Subcontratos, Presupuesto Total y Saldo Disponible con edición en tabla y modal, consolidado de totales en pie y exportación CSV enriquecida.
- [x] **Paso 2 — Avance Programado vs. Avance Real y Costo Ejecutado:** Comparativa de % previsto contractual (Plan) vs. % real certificado por tarea con inputs editables, badges visuales de desvío de plazo (adelantada / en plazo / atrasada), cálculo automático de devengamiento económico ($ Ejecutado vs. Presupuestado y Saldo restante), barra ejecutiva de resumen, tarjeta KPI superior de avance físico dual y exportación CSV con todas las métricas.
- [x] **Paso 3 — Desplazamiento Automático por Lluvia o Demoras (Cascada):** Acción rápida para registrar jornadas de lluvia o demoras climáticas con propagación automática de fechas a tareas activas y futuras en cascada, vista previa en tiempo real de tareas afectadas, preservación de duraciones, botón de reversión/deshacer, banner acumulado de días de lluvia y emisión automática de Acta Técnica en el gestor documental.
- [x] **Paso 4 — Vista Diagrama de Gantt Interactivo:** Conmutador instantáneo de doble vista en Pestaña 2 (`[📊 Diagrama de Gantt]` y `[📋 Planilla & Costos]`), proyección temporal con meses y semanas, barras horizontales proporcionales con doble relleno (% Plan vs. % Real), línea vertical indicadora de fecha actual ("Hoy"), panel lateral de tareas con desvíos y tooltips interactivos de presupuesto y devengamiento.

#### 10. Hoja de Ruta Fase 2 (Evolución ConstructionTech OxI Pro)
- [x] **Paso 1 — Conexión Dinámica de la Curva S (Pestaña 3):** Vinculación directa y reactiva del Control Físico-Financiero con las tareas del Cronograma Gantt (Pestaña 2) y los Rubros Presupuestarios (Pestaña 4). Recálculo dinámico en tiempo real de la Curva S acumulada (% Plan vs. % Real y montos financieros devengados) ante cambios en el cronograma, avance certificado de tareas o corrimiento por lluvia, eliminando datos estáticos de maqueta. Incluye gráfico interactivo SVG con curvas de avance acumulado (Earned Value), línea de "Hoy", KPIs de SPI y SV, y exportación completa a CSV.
- [x] **Paso 2 — Reporte Ejecutivo de Obra en PDF (1 Clic):** Generador de informe directivo oficial de 4 páginas en PDF (`POST /oxipro/report/pdf`) con PDFKit e identidad institucional Óxida / OxI Pro. Incluye portada ejecutiva y ficha técnica de obra con KPIs (Plan, Real, SV, SPI, Devengamiento y Lluvias), cronograma detallado de tareas con cuadrillas y plazos, balance de rubros con leyes sociales (BPS ~65%) y materiales, historial de actas de lluvia y bloques formales de firma técnica para comitentes e inversores, con botón directo en cabecera y fallback de impresión.
- [x] **Paso 3 — Persistencia en Backend (PostgreSQL Multi-usuario):** Migración y persistencia completa del modelo de datos de OxI Pro en tablas relacionales PostgreSQL (`b2b_project_tasks`, `b2b_project_rubros`, `b2b_project_delays` en migración `038_oxipro_collaboration_tables.sql`) y soporte dual en memoria/JSON. Endpoints REST dedicados (`GET/PUT /customer/b2b-projects/:projectId/oxipro/...`) con auto-sincronización debounceada en segundo plano, indicador de estado en vivo (`☁️ Guardado en la nube (PostgreSQL)` / `📁 Modo Local / Demo`) y persistencia multi-usuario colaborativa para directores de obra y administración.
- [x] **Paso 4 — Certificaciones de Obra con Fotos y Registro de Inspección:** Sistema de certificación técnica de avance físico con registro de inspecciones por tarea. Modal interactivo para certificar porcentaje real con nombre de inspector/dirección de obra, fecha de relevamiento, observaciones técnicas de ensayos de calidad y carga de fotos de evidencia con vista previa de miniaturas, visor lightbox en alta resolución y bitácora histórica de certificaciones por partida.
- [x] **Paso 5 — Auto-Onboarding de Obras con IA (Pliegos a Gantt):** Motor de ingestión asistida con Inteligencia Artificial (`POST /oxipro/ai-onboarding`) para estructurar obras automáticamente a partir de pliegos técnicos o memorias descriptivas. Soporte para OpenAI (`gpt-4o-mini`) y motor heurístico de construcción (normativa BPS 65%, categorías SUNCA, herrería y cerramientos Óxida). Plantillas rápidas para Edificio Residencial, Nave Industrial y Reforma Comercial con previsualización interactiva y botón de inyección directa en el cronograma Gantt y rubros en 1 clic.

### 🏗️ Arquitectura y Funcionamiento de OxI Pro Suite (ConstructionTech)

OxI Pro es la solución integral de gestión técnica y financiera de obras para estudios de arquitectura, constructoras y desarrolladores. Está articulada en 4 pestañas operativas y respaldada por servicios de backend dedicados:

#### Pestaña 1: Gestor Documental Técnico & Versionado de Planos
- **Clasificación por tipo:** Planos arquitectónicos y estructurales, Certificaciones de avance, No Conformidades de auditoría, Seguridad y Salud laboral (SST), y Gestión Ambiental.
- **Versionado incremental de iteraciones:** Carga de nuevas versiones (`v1.0` -> `v2.0` -> `v2.1`) con reemplazo de archivo, memoria técnica de cambios, responsable y trazabilidad histórica completa.
- **Descargas directas:** Acceso directo a archivos originales en formato CAD (`.dwg`, `.dxf`), PDF, imágenes o planillas técnicas.

#### Pestaña 2: Cronograma Gantt Interactivo & Asignación de Cuadrillas
- **Doble vista operativa:** Selector rápido entre vista gráfica `[📊 Diagrama de Gantt]` y vista matricial `[📋 Planilla & Costos]`.
- **Estructuración de tareas:** Fechas de inicio y fin, cálculo dinámico de días hábiles, mes calendario y cuadrillas asignadas por categoría salarial (Capataz General, Oficial Especializado, Oficial, Medio Oficial, Peón Práctico).
- **Control dual de avance:** Comparativa visual en barra de avance programado (Plan contractual) vs. avance real físico ejecutado, con badges automáticos de desvío de plazo (`+X% Adelantada`, `0% En plazo`, `-X% Atrasada`).
- **Desplazamiento en cascada por lluvias:** Registro de temporales climáticos con corrimiento automático de fechas para tareas activas y futuras, preservando duraciones, con opción de reversión en 1 clic y generación automática de Acta de Suspensión en el gestor documental.
- **Certificaciones con fotos de evidencia:** Botón `📸 Certificar` por partida para registrar porcentaje real, inspector responsable, fecha, observaciones técnicas y fotos de obra con visor Lightbox en alta definición.

#### Pestaña 3: Curva S Dinámica & Control Físico-Financiero (EVM)
- **Conexión reactiva en tiempo real:** Se recalcula automáticamente a partir de las tareas del Gantt y de los rubros presupuestarios.
- **Earned Value Management (EVM):**
  - Curva Planificada (P0): Inversión y avance programado acumulado en el tiempo.
  - Curva Real: Inversión devengada real según certificaciones físicas de avance.
  - Línea vertical indicadora de la fecha actual (*"Hoy"*).
  - Indicadores clave de desempeño: **SPI** (*Schedule Performance Index*) y **SV** (*Schedule Variance*).
- **Gráfico SVG interactivo:** Puntos de control semanales con tooltips detallados de avance y montos, tabla mensual de devengamiento y exportación completa a CSV.

#### Pestaña 4: Presupuestos vs. Ejecutados & Leyes Sociales por Rubro
- **Desglose tripartito de costos:** Mano de Obra directa, Leyes Sociales (aportes BPS estimados al 65% sobre mano de obra según Ley 14.411) y Materiales / Subcontratos.
- **Semáforo automático de sobrecosto:** Estado *Normal*, *Advertencia* ($\ge 85\%$) y *Crítico* ($> 100\%$) con alertas visuales destacadas.
- **Consolidado financiero:** Presupuesto total asignado, costo ejecutado devengado y saldo restante por ejecutar.
- **Exportación ejecutiva a CSV:** Descarga con formato compatible Excel y codificación UTF-8 BOM.

#### Servicios y Motores de Backend de OxI Pro
1. **Informe Ejecutivo en PDF (`POST /oxipro/report/pdf`):**
   - Motor: PDFKit ([`backend/src/oxiProReportPdfService.js`](backend/src/oxiProReportPdfService.js)).
   - Reporte directivo de 4 páginas de alta calidad gráfica:
     - Página 1: Ficha técnica de obra, métricas globales de avance, SPI, SV, devengamiento económico y días de lluvia acumulados.
     - Página 2: Cronograma detallado de tareas con cuadrillas, tarifas salariales y plazos.
     - Página 3: Desglose de rubros presupuestarios con leyes sociales BPS y saldo por ejecutar.
     - Página 4: Historial de actas de lluvia / suspensiones climáticas y bloques formales de firma técnica homologada.
2. **Persistencia Relacional Multi-usuario (PostgreSQL):**
   - Tablas dedicadas: `b2b_project_tasks`, `b2b_project_rubros`, `b2b_project_delays` vinculadas a `b2b_projects(id)` con borrado en cascada (migración `038_oxipro_collaboration_tables.sql`).
   - Sincronización colaborativa: El cliente web detecta modificaciones y las guarda automáticamente en segundo plano con debounce de 1.2s.
   - Indicador de estado en tiempo real en la barra de OxI Pro: `☁️ Guardado en la nube (PostgreSQL)` / `📁 Modo Local / Demo`.
3. **Auto-Onboarding con Inteligencia Artificial (`POST /oxipro/ai-onboarding`):**
   - Motor híbrido ([`backend/src/oxiProAiService.js`](backend/src/oxiProAiService.js)): Conexión con OpenAI (`gpt-4o-mini`) y motor heurístico offline de ingeniería civil.
   - Ingestión de memorias descriptivas o pliegos técnicos con generación automática de tareas secuenciales, cuadrillas, cálculos BPS (65%) y rubros.
   - Plantillas rápidas para Edificio Residencial, Nave Industrial y Reforma Comercial con inyección en 1 clic (*Reemplazar* o *Anexar*).

## Experiencia pública e identidad vigente


### Escritura de marca

- La marca principal se escribe siempre **Mercadobra**, sin mayúscula interna.
- La unidad técnica y productiva se presenta editorialmente como **Óxida Studio**.
- Los nombres de sus cinco unidades son **Óxida Projects**, **Óxida Pro**, **Óxida Custom Works**, **Óxida Collection** y **Óxida Care**.
- Los nombres internos históricos de proveedor o migraciones pueden conservar `Oxida Studio` sin tilde para no romper relaciones de datos; la interfaz pública utiliza la escritura editorial.

### Encabezado y navegación

El menú principal mantiene siempre las rutas esenciales:

- **Inicio**
- **Quiénes somos**
- **Óxida Studio**
- **Contáctenos**

En **Inicio** y en `/oxida` aparece además una barra editorial oscura titulada **Nuestras unidades**. Utiliza numeración `01–05`, separadores sutiles y el naranja Óxida para destacar `Projects`, `Pro`, `Custom Works`, `Collection` y `Care`. Desde Inicio cada enlace abre la sección correspondiente de Óxida; dentro de `/oxida` funciona como navegación interna.

### Posicionamiento comercial

El buscador/cotizador público se especializa en hierro y soluciones a medida. Su mensaje vigente es:

```text
Lo que imaginás, en hierro.
Tu idea. Una cotización a medida.
```

El campo propone ejemplos concretos —escalera, parrillero, estructura o pieza a medida— y la acción principal es **Cotizar ahora**. El objetivo es iniciar una búsqueda comercial y presentar alternativas relevantes antes de solicitar los datos de contacto.

La página **Quiénes somos** presenta a Mercadobra como una plataforma que conecta proyecto, producto y ejecución. Explica el crecimiento incremental de catálogo, clientes, proveedores, cotizaciones, proyectos y seguimiento comercial, y posiciona a Óxida Studio como la capacidad técnica y productiva del ecosistema.

### Sistema de unidades Óxida

| Unidad | Enfoque |
| --- | --- |
| **Óxida Projects** | Desarrollo integral, diseño, ejecución de arquitectura, coordinación y dirección de obra representando al cliente. |
| **Óxida Pro** | Soluciones para estudios, constructoras y desarrolladores: cálculo estructural, memoria de estructura, visitas y asesoramiento técnico. |
| **Óxida Custom Works** | Fabricación especializada, estructuras, parrilleros y soluciones completamente a medida. |
| **Óxida Collection** | Muebles y objetos de diseño de edición propia, presentados y comercializados mediante ecommerce. |
| **Óxida Care** | Mantenimiento de estructuras y parrilleros, restauración y servicio de posventa. |

El sistema visual de Óxida utiliza fondo grafito, superficies cálidas, tipografía editorial y naranja óxido como acento. La navegación de unidades debe conservar esa jerarquía sin reemplazar el menú principal de Mercadobra.

**Óxida Collection** concentra la oferta estandarizable y comprable: muebles, objetos y modelos base con precio, fotografías, medidas, variantes y disponibilidad. Puede admitir opciones controladas de color, terminación o medida, pero su flujo principal es ecommerce. Los trabajos que necesitan relevamiento, ingeniería o una definición completamente nueva permanecen en **Óxida Custom Works** y utilizan el flujo de cotización.

## Roles y alcance

### Clientes

- Registro e inicio de sesión.
- Persistencia segura de sesión.
- Carrito con revalidación de precio, stock y estado.
- Checkout y seguimiento de pedidos.
- Las cuentas creadas en una base anterior no se migran automáticamente a una base nueva.

### Proveedores

- Inicio de sesión independiente.
- Productos asociados al proveedor.
- Acceso restringido para no modificar publicaciones de otras empresas.
- Gestión de pedidos relacionados con sus productos.

### Administradores

- Alta, edición, publicación, archivo y eliminación de productos.
- Gestión de pedidos, consultas de cotización y solicitudes personalizadas.
- Publicación para cualquier proveedor o sin proveedor asociado.
- Cuenta administrada mediante `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_COMPANY`.

## OXI Modela — beta privada

**Nombre del producto:** OXI Modela

**Descripción:** diseño paramétrico 2D/3D para construcción, ambientes y futuras estructuras metálicas.

**Estado:** primera versión funcional desplegada en producción.

**Ruta:** `/admin/modelador`

**Acceso:** exclusivamente mediante una sesión con rol `admin`. Los clientes, proveedores y usuarios creados desde el portal no ven el acceso y tampoco pueden utilizar los endpoints del simulador.

OXI Modela es un modelador paramétrico propio alojado actualmente dentro del portal administrativo de Mercadobra. No incrusta SketchUp ni depende de una instalación de escritorio. Su objetivo es permitir el diseño preliminar de espacios, la documentación y los futuros cómputos de obra desde el navegador, incluyendo posteriormente operación mediante prompts.

El acceso **Simulador 3D · Beta** aparece en la navegación de Productos y como **Simulador 3D** en Clientes, Pedidos, Consultas y Personalizaciones.

### Funciones disponibles

- Lienzo interactivo con rejilla, ejes y ajuste de coordenadas cada 10 cm.
- Vista 3D WebGL navegable y vista ortográfica de planta mediante Canvas.
- Vistas 3D predefinidas: perspectiva, frente, fondo y laterales.
- Ocultamiento temporal de muros y acción **Mostrar todo** para revisar interiores.
- Primer modo de recorrido interior para escritorio, con cámara a 1,65 m, mouse y movimiento mediante `WASD` o flechas.
- Zoom mediante rueda del mouse o trackpad.
- Creación consecutiva de muros mediante puntos.
- Altura y espesor configurables para muros nuevos.
- Selección de elementos desde el lienzo o el listado lateral.
- Eliminación y deshacer con un historial local de hasta 50 estados.
- Nombre editable para el proyecto.
- Métricas de cantidad de muros, aberturas, muebles y longitud total de muros.
- Guardado en PostgreSQL con número de versión incremental.
- Guardado automático 1,5 segundos después del último cambio.
- Detección de conflictos para impedir que una pestaña desactualizada sobrescriba otra versión.
- Respaldo en `localStorage` cuando el backend no está disponible.
- Interacción adaptada para mouse, trackpad y pantalla táctil.

### Puertas y ventanas

Las aberturas siempre pertenecen a un muro existente. Al eliminar el muro también se eliminan sus aberturas para evitar referencias huérfanas.

**Puertas:**

- Inserción haciendo clic sobre un muro.
- Ancho y altura configurables.
- Posición normalizada sobre el muro.
- Representación de hoja y apertura en planta.
- Sentido de apertura editable: izquierda/derecha e interior/exterior.
- Marco, dintel y hoja abierta representados en 3D.

**Ventanas:**

- Inserción haciendo clic sobre un muro.
- Ancho, altura y antepecho configurables.
- Posición normalizada sobre el muro.
- Representación diferenciada en planta y 3D, con marco y vidrio translúcido.

La vista 3D divide paramétricamente cada muro alrededor de sus aberturas. Las puertas generan jambas y dintel; las ventanas generan laterales, antepecho y dintel. Al mover o redimensionar una abertura, las piezas sólidas se recalculan sin modificar el documento de dominio.

### Cielorraso y techo

El panel **Construcción** permite activar un cielorraso plano y un techo plano que cubren automáticamente la huella rectangular ocupada por los muros. El cielorraso admite altura configurable; el techo admite espesor y alero. Ambos pueden ocultarse temporalmente para inspeccionar el interior en la vista 3D.

### Ambientes y pisos automáticos

El modelador detecta perímetros cerrados rectangulares, irregulares y subdivididos por muros interiores. Cada ambiente detectado muestra su nombre y superficie en planta y genera automáticamente un piso 3D con la forma real del recinto. El piso puede seleccionarse tanto en planta como en 3D para editar el nombre, el tipo de ambiente y el material: hormigón, cerámica, madera o porcelanato. El panel también informa superficie, perímetro, cantidad de ambientes y metros cuadrados totales.

Los datos del ambiente se vinculan a los cuatro muros que lo forman, por lo que se conservan cuando cambian sus dimensiones sin abrir el recinto. Si se abre el perímetro al eliminar o mover un muro, el piso deja de representarse para evitar superficies huérfanas.

### Biblioteca de muebles

El catálogo inicial contiene:

| Tipo interno | Elemento | Medida inicial aproximada |
| --- | --- | --- |
| `bed` | Cama | 1,60 × 2,00 × 0,55 m |
| `sofa` | Sofá | 2,00 × 0,85 × 0,80 m |
| `table` | Mesa | 1,40 × 0,80 × 0,75 m |
| `chair` | Silla | 0,50 × 0,50 × 0,90 m |
| `wardrobe` | Placard | 1,80 × 0,60 × 2,20 m |
| `toilet` | Inodoro | 0,42 × 0,70 × 0,75 m |

Después de seleccionar un mueble se puede:

- Modificar ancho, profundidad y altura.
- Editar sus coordenadas X e Y.
- Definir la rotación en grados.
- Rotar rápidamente 90°.
- Arrastrarlo directamente sobre el lienzo.
- Eliminarlo o deshacer la modificación.

Las formas actuales son representaciones geométricas livianas y no modelos fotorealistas. Esto permite mantener el editor rápido mientras se consolida la lógica paramétrica.

### Uso básico

1. Iniciar sesión en `/admin/login`.
2. Abrir **Simulador 3D** o navegar a `/admin/modelador`.
3. Elegir un proyecto existente o presionar **Nuevo proyecto**.
4. Asignar un nombre al proyecto.
5. Seleccionar **Muro** y marcar puntos consecutivos sobre la rejilla.
6. Presionar `Esc` para finalizar o cancelar la cadena de muros.
7. Seleccionar **Puerta** o **Ventana**, configurar sus medidas y hacer clic sobre un muro.
8. Seleccionar **Muebles**, elegir el tipo y hacer clic para ubicarlo.
9. Usar **Seleccionar** para editar, arrastrar, rotar o eliminar elementos.
10. Alternar entre **Planta** y **3D** para revisar el modelo.
11. Presionar **Guardar** para persistirlo en PostgreSQL.

### Modelo de datos

La tabla `modeler_projects`, creada en la migración `031_modeler_projects.sql` y ampliada por `032_modeler_multiple_projects.sql`, almacena varios proyectos por administrador. El proyecto anterior se conserva automáticamente al aplicar la migración.

```text
modeler_projects
  id
  owner_user_id -> users.id
  name
  model JSONB
  version
  created_at
  updated_at
```

El documento `model` utiliza esta estructura:

```json
{
  "walls": [
    {
      "id": "uuid",
      "start": { "x": 0, "y": 0 },
      "end": { "x": 4, "y": 0 },
      "height": 2.7,
      "thickness": 0.15
    }
  ],
  "openings": [
    {
      "id": "uuid",
      "type": "door",
      "wallId": "uuid",
      "t": 0.5,
      "width": 0.9,
      "height": 2.1,
      "sill": 0,
      "swing": "left-in"
    }
  ],
  "furniture": [
    {
      "id": "uuid",
      "type": "bed",
      "x": 2,
      "y": 2,
      "width": 1.6,
      "depth": 2,
      "height": 0.55,
      "rotation": 0
    }
  ]
}
```

`openings[].t` expresa la posición relativa a lo largo del muro, entre `0` y `1`. En las puertas, `openings[].swing` admite `left-in`, `right-in`, `left-out` y `right-out`; los proyectos anteriores se normalizan como `left-in`. `furniture[].rotation` se almacena en radianes, aunque la interfaz lo presenta en grados.

### API y seguridad

El botón **Asistente** abre el chat privado del simulador. El chat convierte instrucciones en una vista previa de acciones estructuradas; ninguna acción modifica el modelo hasta que el administrador presiona **Aplicar cambios**. Un plan completo se incorpora como un único estado del historial para poder deshacerlo.

El MVP reconoce creación de habitaciones rectangulares, puertas, ventanas, muebles del catálogo y limpieza total del modelo. Acepta medidas en metros y sinónimos como `ropero`, `armario`, `placard`, `sofá` o `sillón`. Cuando OpenAI no está configurado o no responde, utiliza un intérprete local para estos comandos básicos.

La integración con OpenAI utiliza salida estructurada restringida por JSON Schema. No permite que el modelo ejecute JavaScript, consultas SQL ni código arbitrario.

Los endpoints disponibles son:

- `GET /admin/modeler/projects`: lista los proyectos del administrador autenticado.
- `POST /admin/modeler/projects`: crea un proyecto vacío independiente.
- `GET /admin/modeler/projects/:projectId`: recupera un proyecto específico.
- `PUT /admin/modeler/projects/:projectId`: valida y guarda el documento completo, incrementando su versión.
- `GET|PUT /admin/modeler/project`: compatibilidad temporal con el proyecto actualizado más recientemente.
- `POST /admin/modeler/interpret`: interpreta una instrucción y devuelve un plan de acciones sin ejecutarlo.

Ambos requieren token Bearer y rol `admin`. El backend vuelve a validar todos los datos aunque el frontend ya los haya controlado:

- Hasta 2.000 muros.
- Hasta 4.000 aberturas.
- Hasta 4.000 muebles.
- Coordenadas, medidas, rotaciones y posiciones dentro de rangos permitidos.
- Tipos de abertura limitados a `door` y `window`.
- Tipos de mueble limitados al catálogo conocido.
- Cada abertura debe referenciar un muro incluido en el mismo documento.

La IA futura no ejecutará JavaScript ni código arbitrario. Los prompts se convertirán en operaciones estructuradas y autorizadas sobre este mismo modelo de datos.

### Archivos principales

| Archivo | Responsabilidad |
| --- | --- |
| `src/pages/AdminModeler.jsx` | Estado, interacción, renderizado Canvas y herramientas del simulador. |
| `src/pages/AdminModeler.css` | Distribución responsive y lenguaje visual. |
| `src/modeler/core.js` | Geometría, validaciones, historial y transformaciones independientes del renderizador. |
| `src/modeler/Modeler3DView.jsx` | Escena Three.js, cámara orbital y representación WebGL del modelo. |
| `src/lib/api.js` | Cliente HTTP para cargar y guardar proyectos. |
| `backend/src/server.js` | Autorización, validación y endpoints del simulador. |
| `backend/src/repository.js` | Persistencia PostgreSQL y alternativa JSON local. |
| `backend/src/migrations/031_modeler_projects.sql` | Tabla e índices del módulo. |
| `backend/src/migrations/032_modeler_multiple_projects.sql` | Elimina la restricción de un único proyecto por administrador. |
| `backend/src/dbCheck.js` | Verificación de la tabla durante el despliegue. |

### Extracción futura como aplicación independiente

OXI Modela puede separarse de Mercadobra y convertirse en una aplicación propia sin rehacer el motor geométrico. La lógica principal ya se encuentra desacoplada en `src/modeler/core.js`, mientras que la escena 3D ocupa su propia capa de representación.

La extracción se realizará gradualmente:

1. Mover el módulo a un paquete o aplicación `oxi-modela` con rutas y diseño visual propios.
2. Reemplazar la autenticación administrativa de Mercadobra por cuentas y organizaciones de OXI Modela.
3. Incorporar una API de proyectos independiente y migrar los documentos existentes.
4. Mantener el editor web como base compartida.
5. Publicar una PWA instalable y, si se necesita distribución en tiendas, envolverla con Capacitor para Android/iOS o Tauri para escritorio.
6. Conectar Mercadobra mediante API, conservándolo como canal de materiales, presupuestos y proveedores.

El formato paramétrico de proyectos debe mantenerse versionado e independiente de la interfaz para que un mismo archivo pueda abrirse en la web, una aplicación instalada o futuras integraciones.

### Desarrollo y verificación

Desde la raíz del frontend:

```bash
npm install
npm run lint
npm run build
```

Para el backend:

```bash
npm --prefix backend install
npm --prefix backend run migrate
npm --prefix backend run db:check
npm --prefix backend run dev
```

En producción, Render ejecuta `npm ci`, las migraciones, la carga idempotente de variables de costos, `db:check` y `admin:bootstrap` antes de iniciar el backend. Vercel compila y publica el frontend al recibir cambios en `main`.

### Estado reciente y hoja de ruta

Esta lista funciona como tablero de seguimiento. Los elementos marcados están publicados en producción; los demás permanecen pendientes.

#### Visión de producto

El objetivo es convertir la beta administrativa en un modelador web colaborativo para terceros, especializado en diseño preliminar de espacios, obra y presupuestación. No se busca reproducir toda la amplitud de SketchUp: la ventaja de Mercadobra debe ser un flujo más simple que conecte el modelo con cantidades, costos, cotizaciones, clientes y proveedores.

La aplicación evoluciona sin descartar el modelo paramétrico actual. Muros, aberturas, ambientes, muebles y materiales siguen siendo entidades de dominio validadas; Three.js/WebGL funciona como motor de representación e interacción 3D, no como fuente única de verdad.

#### Ruta para convertirlo en producto para terceros

##### Fase 1 — Editor preciso y base verificable

**Objetivo:** transformar la demostración actual en una herramienta confiable para dibujar una planta sencilla.

**Estado:** implementación y QA integrada local completadas; pendiente de validación visual manual y despliegue.

- [x] Extraer el estado y las operaciones del modelo fuera del componente visual.
- [x] Incorporar las primeras pruebas unitarias para geometría y operaciones del modelo.
- [x] Arrastrar extremos y editar longitud, altura y espesor de muros existentes.
- [x] Cubrir con pruebas unitarias el historial y las validaciones geométricas principales del editor.
- [x] Agregar bloqueo horizontal/vertical con `Shift` y medidas dinámicas durante el dibujo.
- [x] Mover y redimensionar puertas y ventanas después de insertarlas, manteniéndolas dentro del muro.
- [x] Impedir aberturas fuera del muro, demasiado altas o solapadas, tanto en el editor como en el backend.
- [x] Implementar guardado automático, indicador de cambios y protección frente a sobrescrituras concurrentes.

**Criterio de salida:** una planta residencial simple puede dibujarse, corregirse, guardarse y recuperarse sin perder precisión ni consistencia.

La QA integrada local verificó autenticación administrativa, carga del proyecto, creación de la versión 1, actualización incremental, rechazo `409` de una escritura obsoleta y rechazo `400` de geometría inválida. La prueba se ejecutó con una copia temporal del backend y almacenamiento JSON aislado, sin utilizar datos de producción.

##### Fase 2 — Motor 3D paramétrico

**Objetivo:** reemplazar la proyección isométrica por una escena 3D navegable conservando el modelo de dominio.

**Estado:** en curso; primera escena WebGL integrada localmente, pendiente de QA visual y geometría avanzada.

- [x] Integrar Three.js y React Three Fiber mediante una capa de renderizado desacoplada y carga diferida.
- [x] Generar muros con longitud, espesor y altura como volúmenes tridimensionales.
- [x] Generar huecos reales para puertas y ventanas mediante piezas paramétricas del muro.
- [x] Incorporar cámara orbital con rotación, zoom y desplazamiento.
- [x] Incorporar vistas estándar de frente, fondo y laterales.
- [x] Incorporar la primera versión del recorrido en primera persona para escritorio.
- [ ] Impedir que la cámara de recorrido atraviese muros y muebles.
- [ ] Incorporar controles táctiles para el recorrido móvil.
- [x] Detectar perímetros cerrados y generar pisos y ambientes.
- [ ] Agregar materiales, iluminación y sombras con niveles de calidad configurables.
- [x] Mantener una vista de planta precisa además de la escena 3D.

**Criterio de salida:** el mismo proyecto puede editarse en planta y revisarse como geometría tridimensional consistente.

##### Fase 3 — Estructuras metálicas y encuentros constructivos

**Objetivo:** diseñar y acoplar estructuras de hierro a muros, losas y otros elementos de obra, distinguiendo siempre el encaje geométrico de la verificación estructural profesional.

- [ ] Crear una biblioteca paramétrica de vigas, columnas, perfiles, tubos, ángulos y planchuelas.
- [ ] Incorporar placas base, cartelas, ménsulas, bulones, anclajes, soldaduras, perforaciones y cortes.
- [ ] Permitir ajuste automático a caras, ejes, extremos y puntos de apoyo.
- [ ] Crear conectores persistentes entre acero, pared, losa, hormigón y otros soportes.
- [ ] Mantener las uniones al mover o redimensionar los elementos relacionados.
- [ ] Detectar colisiones, interferencias, separaciones insuficientes y componentes desconectados.
- [ ] Generar despieces, listas de materiales y planos preliminares de fabricación.
- [ ] Preparar exportaciones para herramientas externas de cálculo y fabricación.
- [ ] Diferenciar visualmente `encaje geométrico`, `pendiente de verificación` y `verificado por profesional`.
- [ ] Registrar responsable, fecha, hipótesis y documento de cada verificación estructural.

**Criterio de salida:** una estructura metálica puede modelarse, acoplarse y documentarse dentro de una construcción sin presentar el encaje visual como garantía de seguridad estructural.

##### Fase 4 — Gestión de proyectos

**Objetivo:** dejar de tener un único modelo administrativo y organizar diferentes obras sin sobrescribir información.

- [ ] Crear una pantalla con el listado de proyectos.
- [ ] Permitir crear, renombrar, duplicar y archivar proyectos.
- [ ] Generar miniaturas automáticas.
- [ ] Incorporar papelera y recuperación.
- [ ] Guardar versiones restaurables.
- [ ] Relacionar proyectos con clientes, obras y cotizaciones.
- [ ] Registrar las operaciones y cambios del modelo.
- [ ] Importar y exportar el formato interno de Mercadobra.

**Criterio de salida:** cada usuario puede administrar varias obras, recuperar versiones anteriores y evitar sobrescrituras accidentales.

##### Fase 5 — Usuarios y colaboración

**Objetivo:** habilitar el uso seguro por clientes, estudios y profesionales externos.

- [ ] Permitir varios proyectos por usuario y organización.
- [ ] Abrir el registro para profesionales y organizaciones.
- [ ] Separar organizaciones, miembros y proyectos.
- [ ] Incorporar roles de propietario, editor y visualizador.
- [ ] Incorporar invitaciones por correo.
- [ ] Compartir proyectos mediante enlaces de solo lectura.
- [ ] Agregar comentarios y observaciones.
- [ ] Aplicar los permisos tanto en frontend como en backend.
- [ ] Detectar conflictos de edición y preparar colaboración simultánea.
- [ ] Definir cuotas de almacenamiento, complejidad del modelo y consumo de IA.

**Criterio de salida:** un tercero puede registrarse, gestionar proyectos y colaborar sin acceder a información de otros usuarios.

##### Fase 6 — Planos y documentación

**Objetivo:** obtener documentación técnica básica a partir del modelo.

- [ ] Incorporar cotas, etiquetas, norte y escalas.
- [ ] Generar plantas, cortes y fachadas.
- [ ] Crear láminas configurables.
- [ ] Exportar documentación a PDF.
- [ ] Exportar imágenes del proyecto.
- [ ] Exportar inicialmente GLB/OBJ.
- [ ] Evaluar DXF/IFC según la demanda de los primeros usuarios.

**Criterio de salida:** el proyecto puede entregarse y revisarse mediante planos básicos con una escala y presentación consistentes.

##### Fase 7 — Cómputos y presupuestos

**Objetivo:** conectar cada decisión de diseño con cantidades, costos y proveedores.

- [ ] Calcular superficies, perímetros, volúmenes y cantidades de materiales.
- [ ] Detectar cantidades de muros, pisos, aberturas y componentes.
- [ ] Crear una biblioteca de materiales, rendimientos y desperdicios.
- [ ] Asociar componentes con productos, precios y proveedores de Mercadobra.
- [ ] Generar presupuestos versionados desde el modelo.
- [ ] Solicitar cotizaciones a proveedores.
- [ ] Actualizar el presupuesto cuando cambie el modelo.

**Criterio de salida:** un proyecto genera planos básicos y un cómputo auditable conectado con una cotización.

##### Fase 8 — Asistente inteligente de diseño

**Objetivo:** permitir operaciones de alto nivel mediante lenguaje natural sin delegar la seguridad ni la geometría a la IA.

- [ ] Enviar al asistente contexto geométrico y selección relevante.
- [ ] Interpretar referencias espaciales y elementos seleccionados.
- [ ] Mover, rotar, redimensionar y eliminar mediante planes confirmables.
- [ ] Proponer distribuciones y amoblamientos según el tipo de ambiente.
- [ ] Conservar historial conversacional por proyecto.
- [ ] Crear una versión recuperable antes de cada operación asistida.
- [ ] Registrar costos, límites, prompts y acciones para auditoría.

**Criterio de salida:** la IA acelera tareas repetitivas y complejas, pero todas sus acciones son estructuradas, visibles, validables y reversibles.

##### Fase 9 — Lanzamiento comercial

**Objetivo:** operar el modelador como servicio sostenible para terceros.

- [ ] Definir planes gratuito, profesional y organización.
- [ ] Integrar suscripciones, facturación y control de capacidad.
- [ ] Incorporar onboarding, proyectos de ejemplo y ayuda contextual.
- [ ] Implementar telemetría de producto sin capturar contenido sensible.
- [ ] Preparar monitoreo, respaldos, recuperación y soporte.
- [ ] Publicar términos, privacidad, propiedad de modelos y política de datos.
- [ ] Ejecutar una beta cerrada con usuarios externos antes del acceso público.
- [ ] Corregir los problemas detectados durante la beta.
- [ ] Abrir gradualmente el acceso público.

**Criterio de salida:** terceros pueden contratar, usar y abandonar el servicio con reglas claras, datos protegidos y operación medible.

#### Orden de ejecución inmediato

La **Fase 2** es la prioridad activa. La primera escena Three.js ya consume el modelo paramétrico sin modificarlo, representa muros y muebles como volúmenes, mantiene la selección y permite navegación orbital. El siguiente bloque es generar huecos reales para las aberturas y conservar la vista de planta como superficie principal de edición precisa.

```text
Precisión 2D
    ↓
Motor geométrico
    ↓
Three.js
    ↓
Estructuras metálicas
    ↓
Proyectos y usuarios
    ↓
Planos y cómputos
    ↓
IA
    ↓
Lanzamiento comercial
```

#### Base y acceso

- [x] Ruta privada `/admin/modelador` exclusiva para sesiones con rol `admin`.
- [x] Acceso **Simulador 3D** desde la navegación administrativa.
- [x] Persistencia PostgreSQL mediante `modeler_projects`.
- [x] Versionado incremental al guardar.
- [x] Autoguardado con control optimista de versión y detección de conflictos entre pestañas.
- [x] Respaldo local cuando el backend no está disponible.
- [x] Logo ÓXIDA corregido para escritorio y pantallas responsive.
- [x] Panel de propiedades disponible en escritorio, ventanas pequeñas y móvil.
- [ ] Relacionar cada modelo con una obra y un cliente específicos.
- [x] Admitir varios proyectos por administrador, con creación, listado y apertura independiente.
- [ ] Incorporar miniaturas, duplicación, archivado y recuperación de versiones.

#### Muros y precisión de dibujo — próxima prioridad

- [x] Crear y eliminar muros.
- [x] Definir altura y espesor al crearlos.
- [x] Ajuste de coordenadas a la rejilla.
- [x] Mostrar longitud total del modelo.
- [x] Arrastrar los extremos de un muro.
- [x] Editar numéricamente longitud, altura y espesor de muros existentes.
- [ ] Unir y limpiar esquinas automáticamente.
- [ ] Dividir, duplicar y desplazar muros.
- [x] Bloquear dibujo a ejes horizontal y vertical con `Shift`.
- [x] Mostrar longitud y desplazamientos X/Y mientras se dibuja.

#### Puertas y ventanas

- [x] Insertar puertas y ventanas vinculadas a un muro.
- [x] Configurar medidas iniciales y antepecho.
- [x] Representarlas en planta y vista 3D.
- [x] Eliminar aberturas dependientes cuando se elimina su muro.
- [x] Mover una abertura a lo largo del muro.
- [x] Redimensionar ancho, altura y antepecho después de insertarla.
- [x] Cambiar el sentido de apertura de las puertas.
- [x] Evitar que una abertura sobresalga por los extremos del muro.
- [x] Evitar solapamientos entre aberturas del mismo muro.
- [ ] Incorporar puertas dobles/corredizas y ventanas fijas/batientes.
- [x] Recortar físicamente las aberturas en los sólidos de los muros.

#### Ambientes, pisos y materiales

- [x] Detectar automáticamente perímetros cerrados.
- [x] Crear pisos automáticos con la forma real del ambiente.
- [x] Detectar ambientes con plantas irregulares y muros divididos.
- [ ] Crear losas y ambientes persistentes editables.
- [x] Generar un cielorraso plano configurable sobre la huella del modelo.
- [x] Generar un techo plano con espesor y alero configurables.
- [ ] Incorporar techos inclinados, a dos aguas y faldones editables.
- [x] Nombrar ambientes: dormitorio, cocina, baño, etc.
- [x] Calcular superficie y perímetro por ambiente.
- [x] Asignar materiales básicos a los pisos.
- [ ] Crear una biblioteca completa de materiales y terminaciones.
- [x] Ocultar muros temporalmente para revisar interiores.

#### Mobiliario

- [x] Biblioteca inicial: cama, sofá, mesa, silla, placard e inodoro.
- [x] Selección, eliminación y rotación.
- [x] Edición de ancho, profundidad, altura, posición y ángulo.
- [x] Arrastre con mouse, trackpad o pantalla táctil.
- [ ] Ampliar cocina, baño, luminarias, electrodomésticos y exterior.
- [ ] Incorporar modelos visuales detallados sin degradar el rendimiento.
- [ ] Detectar colisiones entre muebles, muros y aberturas.

#### Chat e inteligencia artificial

- [x] Botón superior **Asistente** y acceso flotante **Chat IA**.
- [x] Endpoint privado `/admin/modeler/interpret` exclusivo para admin.
- [x] Vista previa, confirmación y cancelación antes de modificar el modelo.
- [x] Ejecución agrupada para deshacer un prompt completo.
- [x] Structured Outputs con JSON Schema y sin ejecución de código libre.
- [x] Intérprete local cuando OpenAI no está disponible.
- [x] Creación por prompt de habitaciones, puertas, ventanas y muebles iniciales.
- [x] Buscar automáticamente una posición libre para las aberturas creadas por el asistente.
- [ ] Entender referencias al elemento seleccionado: “esta cama” o “esta ventana”.
- [ ] Mover, rotar, redimensionar y eliminar elementos mediante prompts.
- [ ] Entender relaciones espaciales: frente, detrás, opuesto, centrado y esquina.
- [ ] Amueblar automáticamente un ambiente según su tipo.
- [ ] Conservar historial conversacional por proyecto.
- [ ] Crear una versión automática antes de cada operación de IA.

#### Motor 3D y navegación

- [x] Vista isométrica y planta mediante Canvas.
- [x] Zoom y selección gráfica.
- [x] Migrar la vista 3D a WebGL/Three.js sin reemplazar el modelo de dominio.
- [x] Incorporar órbita libre, zoom, paneo y selección en la escena 3D.
- [x] Incorporar vistas estándar.
- [x] Incorporar cámara en primera persona con teclado y mouse.
- [ ] Incorporar colisiones y controles táctiles al recorrido.
- [x] Representar muros y muebles como sólidos con iluminación y sombras básicas.
- [ ] Incorporar materiales, texturas y niveles de calidad configurables.
- [ ] Optimizar modelos grandes mediante instancias y Web Workers.

#### Planos, cómputos e interoperabilidad

- [ ] Cotas, etiquetas y escalas.
- [ ] Plantas, cortes y fachadas.
- [ ] Exportación PDF.
- [ ] Cómputo de superficies, volúmenes y cantidades de materiales.
- [ ] Vincular cantidades con productos y precios de Mercadobra.
- [ ] Exportar GLB/OBJ.
- [ ] Evaluar compatibilidad SKP, DXF e IFC.

#### Seguridad y trazabilidad

- [x] Autenticación administrativa en frontend y backend.
- [x] Validación de tipos, medidas, coordenadas y referencias en backend.
- [x] Confirmación de planes generados por IA.
- [ ] Registrar historial de prompts y acciones administrativas.
- [ ] Establecer límites de uso y costos de IA por proyecto.
- [ ] Auditoría de cambios destructivos.

## Dirección de producto y estilo de plataforma

Mercadobra debe evolucionar como una plataforma modular, no como una suma de pantallas aisladas. Cada módulo administrativo comparte navegación, jerarquía visual, estados, filtros, formularios y patrones de confirmación.

### Principios visuales

- **Minimalista:** mostrar primero la información necesaria para decidir y ocultar el detalle secundario hasta que se solicite.
- **Profesional y cálido:** superficies limpias, tonos neutros, acentos terracota/naranja de marca y fotografías como elemento humano.
- **Denso sin sentirse pesado:** tablas y tarjetas compactas, buen espacio vertical y acciones agrupadas.
- **Consistente:** mismos componentes para métricas, filtros, badges, paneles laterales, modales, errores y estados vacíos.
- **Responsive:** escritorio orientado a operación rápida; móvil orientado a consulta y edición puntual.
- **Accesible:** contraste suficiente, foco visible, etiquetas explícitas y navegación completa con teclado.
- **Feedback inmediato:** guardado, error, carga y acciones destructivas siempre tienen un estado visible.

### Lenguaje de interfaz

- Títulos directos: “Clientes”, “Pedidos”, “Productos”.
- Acciones concretas: “Editar datos”, “Guardar cambios”, “Desactivar cliente”.
- Badges breves para estados y segmentos.
- Mensajes en español rioplatense, claros y sin tecnicismos internos.
- Iconografía lineal pequeña; no usar íconos decorativos si no agregan información.

### Base escalable

- Navegación administrativa común para todos los módulos.
- Componentes reutilizables de búsqueda, filtros, paginación, tabla, tarjeta y panel de edición.
- Datos consultados mediante API; no duplicar reglas comerciales en componentes React.
- Paginación y filtros del lado del servidor antes de que el volumen de registros crezca.
- Estados de dominio definidos y validados en backend.
- Historial de cambios para datos sensibles y acciones administrativas.
- Permisos preparados para futuros roles como soporte, ventas y operador.
- Migraciones SQL incrementales; nunca modificar manualmente el esquema de producción.

## Módulo administrativo de clientes — definición

**Estado:** primera versión implementada; auditoría, paginación de servidor y restablecimiento de contraseña quedan para etapas posteriores.

**Ruta:** `/admin/clientes`

**Objetivo:** permitir que un administrador encuentre, consulte y actualice datos de clientes sin acceder directamente a PostgreSQL, conservando seguridad, trazabilidad y capacidad de crecimiento.

### Vista principal

La pantalla mantiene el lenguaje visual del panel de productos:

- Encabezado “Clientes” y acción **Nuevo cliente**.
- Métricas compactas: total, activos, clientes con pedidos y bloqueados.
- Búsqueda por nombre, email, teléfono o documento.
- Filtro actual por estado; fecha, localidad y actividad comercial quedan como ampliaciones futuras.
- Tarjetas operativas adaptadas para escritorio y móvil.
- La paginación de servidor queda pendiente para una etapa de mayor volumen.

Columnas iniciales:

| Campo | Descripción |
| --- | --- |
| Cliente | Nombre y avatar generado con iniciales. |
| Contacto | Email y teléfono. |
| Ubicación | Localidad o departamento. |
| Actividad | Cantidad de pedidos y fecha del último pedido. |
| Estado | Activo, inactivo o bloqueado. |
| Alta | Fecha de creación de la cuenta. |
| Acciones | Ver detalle y editar. |

### Perfil y edición

Al seleccionar un cliente se abre una página o panel lateral con:

- Nombre y apellido.
- Email principal.
- Teléfono.
- Documento, opcional y protegido.
- Empresa o razón social, opcional.
- Dirección, localidad y departamento.
- Preferencias de contacto.
- Estado de la cuenta.
- Fecha de alta y último acceso.
- Resumen de pedidos, consultas y gasto histórico.
- Notas internas, visibles solo para administradores.

Los cambios se guardan mediante una acción explícita. Cerrar con modificaciones pendientes debe solicitar confirmación.

### Reglas de seguridad

- Solo administradores autenticados pueden listar o editar clientes.
- Nunca se muestra ni se recupera una contraseña.
- El administrador puede iniciar un restablecimiento, pero no definir una contraseña en nombre del cliente.
- El email se normaliza y debe permanecer único.
- Los cambios de email, estado y datos sensibles generan un registro de auditoría.
- Bloquear una cuenta revoca sus sesiones activas.
- Eliminar físicamente un cliente no forma parte de la primera versión; se utiliza desactivación para conservar pedidos e historial.
- Las respuestas de la API no deben exponer hashes, tokens ni campos internos.

### Modelo de datos propuesto

La tabla `users` conserva autenticación y rol. El perfil ampliado debe separarse para evitar mezclar credenciales con datos comerciales:

```text
users
  id, email, password, role, company, created_at

customer_profiles
  user_id, first_name, last_name, phone, document,
  company_name, address, city, department,
  contact_preferences, status, internal_notes,
  created_at, updated_at

customer_audit_log
  id, customer_user_id, admin_user_id, action,
  changed_fields, created_at
```

Los nombres definitivos se validarán contra el esquema existente antes de crear la migración. Documento y notas internas requieren especial cuidado por tratarse de datos personales.

### API propuesta

- `GET /admin/customers`: listado paginado con búsqueda y filtros.
- `GET /admin/customers/:id`: perfil, actividad y resumen comercial.
- `PATCH /admin/customers/:id`: actualización parcial validada.
- `PATCH /admin/customers/:id/status`: activar, desactivar o bloquear.
- `POST /admin/customers/:id/password-reset`: iniciar restablecimiento seguro.
- `GET /admin/customers/:id/audit-log`: historial de cambios autorizado.

Todas las rutas requieren sesión administrativa. El listado debe devolver metadatos de paginación y seleccionar solamente los campos necesarios.

### Implementación por etapas

1. **Base operativa — implementada:** migración de perfiles, alta administrativa inactiva, listado, búsqueda, detalle y edición básica.
2. **Seguridad:** estados de cuenta, revocación de sesiones y auditoría.
3. **Visión comercial:** pedidos, consultas, gasto y última actividad.
4. **Escala:** filtros avanzados, paginación de servidor, exportación y permisos administrativos granulares.

### Criterios para considerar lista la primera versión

- El administrador accede desde la navegación del panel.
- Puede buscar y abrir un cliente real de PostgreSQL.
- Puede editar nombre, teléfono, empresa, dirección y localidad.
- Email único y campos obligatorios se validan en frontend y backend.
- Los datos se mantienen después de recargar.
- No se exponen credenciales ni hashes.
- Los pedidos existentes conservan su relación con el cliente.
- La interfaz funciona en escritorio y móvil.
- Existen estados de carga, vacío, éxito y error.
- Las operaciones críticas tienen pruebas automatizadas.

## Cotizaciones, proyectos y pagos por cliente — definición

**Estado:** primera etapa implementada; pagos, documentos, trazabilidad y portal quedan pendientes.

**Ubicación actual:** dentro del detalle de `/admin/clientes/:id`, en el bloque **Cotizaciones y trabajos**.

**Objetivo:** conservar en un solo historial comercial todas las cotizaciones enviadas a un cliente, sus archivos, evolución a proyecto y calendario real de cobros.

### Relación principal

```text
Cliente
  └── Cotización / trabajo
        ├── Estado comercial y operativo
        ├── Archivos adjuntos
        ├── Monto y moneda
        └── Entregas de pago
```

Un cliente puede tener múltiples cotizaciones. Cada cotización conserva sus propios documentos, monto, estado y pagos; nunca se suman o mezclan entregas entre trabajos diferentes.

### Datos de cada cotización o trabajo

- Número interno consecutivo.
- Título breve del trabajo.
- Descripción y alcance.
- Fecha de creación.
- Fecha de envío al cliente.
- Fecha estimada de inicio y finalización.
- Monto total.
- Moneda (`UYU` o `USD`).
- Estado actual.
- Notas internas.
- Responsable administrativo, preparado para futuros equipos.
- Fecha de última actualización.

### Estados

La primera versión utiliza un flujo único y ordenado:

| Estado | Significado |
| --- | --- |
| `in_progress` | Cotización en proceso de preparación. |
| `sent` | Cotización enviada al cliente. |
| `accepted` | Cotización aceptada. |
| `project_in_progress` | Proyecto o trabajo en desarrollo. |
| `completed` | Proyecto o trabajo terminado. |
| `rejected` | Cotización rechazada. |
| `cancelled` | Cotización o proyecto cancelado. |

La interfaz mostrará etiquetas en español: **En proceso**, **Enviada**, **Aceptada**, **Proyecto en desarrollo**, **Terminado**, **Rechazada** y **Cancelada**.

Cada cambio de estado debe registrar fecha, administrador responsable y estado anterior. Los estados `rejected` y `cancelled` requieren una nota breve. Un trabajo terminado no se elimina; permanece en el historial del cliente.

### Archivos adjuntos

Cada cotización puede incluir varios documentos:

- Cotización en PDF.
- Planos o imágenes.
- Memoria descriptiva.
- Orden de compra.
- Comprobante de pago.
- Contrato u otro documento comercial.

Metadatos mínimos por archivo:

- Nombre visible.
- Tipo de documento.
- URL privada o firmada.
- Tipo MIME y tamaño.
- Fecha de carga.
- Administrador que lo cargó.

Los archivos no deben guardarse como base64 dentro de PostgreSQL. Se almacenarán en un servicio de objetos —por ejemplo S3, Cloudinary o Supabase Storage— y la base guardará únicamente metadatos y una referencia segura. La descarga debe exigir autorización administrativa; más adelante podrá habilitarse un portal de cliente con enlaces temporales.

### Plan y registro de pagos

Cada cotización aceptada puede tener múltiples entregas. Cada entrega registra:

- Nombre o concepto: seña, avance, saldo, adicional, etc.
- Porcentaje editable de la cotización.
- Monto correspondiente.
- Fecha prevista de pago.
- Fecha real de pago.
- Estado: pendiente, pagado, vencido o anulado.
- Medio de pago.
- Referencia o comprobante.
- Notas internas.

Reglas:

- La suma de entregas activas no puede superar el 100 %.
- El importe sugerido se calcula como `monto total × porcentaje / 100`.
- El administrador puede ajustar el monto por redondeos o adicionales, dejando registro del cambio.
- Cambiar el monto total debe advertir si existen entregas ya pagadas.
- Un pago confirmado conserva el monto y porcentaje históricos aunque luego cambie la cotización.
- El sistema muestra **cobrado**, **pendiente**, **vencido** y **saldo restante**.
- Registrar pagos no equivale a emitir documentación fiscal; facturación e impuestos quedan fuera de esta primera etapa.

Ejemplo:

| Entrega | Porcentaje | Fecha prevista | Estado |
| --- | ---: | --- | --- |
| Seña | 40 % | Al aceptar | Pagado |
| Avance de obra | 30 % | Inicio de fabricación | Pendiente |
| Saldo | 30 % | Entrega final | Pendiente |

### Experiencia dentro del cliente

El perfil tendrá una línea de tiempo con tarjetas de cotización. Cada tarjeta mostrará:

- Número, título y estado.
- Monto total y moneda.
- Progreso de cobro en porcentaje y monto.
- Próxima entrega y fecha.
- Cantidad de documentos.
- Acción **Abrir cotización**.

Dentro de la cotización habrá cuatro bloques: **Resumen**, **Documentos**, **Pagos** e **Historial**. En móvil se apilan verticalmente; en escritorio el resumen y el estado permanecen visibles mientras se revisan documentos o pagos.

### Modelo de datos propuesto

```text
customer_quotes
  id, customer_user_id, reference_number, title, description,
  status, total_amount, currency, sent_at,
  estimated_start_at, estimated_end_at,
  internal_notes, created_by, created_at, updated_at

customer_quote_files
  id, quote_id, file_name, document_type,
  storage_key, mime_type, file_size,
  uploaded_by, created_at

customer_quote_payments
  id, quote_id, concept, percentage, amount,
  due_date, paid_at, status, payment_method,
  reference, receipt_storage_key, internal_notes,
  created_by, created_at, updated_at

customer_quote_status_history
  id, quote_id, previous_status, next_status,
  note, changed_by, created_at
```

Los importes deben almacenarse como `NUMERIC`, nunca como números flotantes. La moneda pertenece a la cotización y todas sus entregas deben utilizar la misma.

### API propuesta

- `GET /admin/customers/:customerId/quotes`
- `POST /admin/customers/:customerId/quotes`
- `GET /admin/quotes/:quoteId`
- `PATCH /admin/quotes/:quoteId`
- `PATCH /admin/quotes/:quoteId/status`
- `POST /admin/quotes/:quoteId/files`
- `DELETE /admin/quotes/:quoteId/files/:fileId`
- `POST /admin/quotes/:quoteId/payments`
- `PATCH /admin/quotes/:quoteId/payments/:paymentId`
- `DELETE /admin/quotes/:quoteId/payments/:paymentId`
- `GET /admin/quotes/:quoteId/history`

Todas las rutas requieren sesión administrativa y validan que la cotización, archivo o pago pertenezca al cliente esperado.

### Implementación por etapas

1. **Cotizaciones — implementada:** tabla, alta, monto, moneda, fechas estimadas y estados.
2. **Pagos:** entregas porcentuales, fechas, estados y resumen cobrado/pendiente.
3. **Documentos:** integración con almacenamiento externo y adjuntos autorizados.
4. **Trazabilidad:** historial de estados, cambios de monto y pagos.
5. **Portal del cliente:** visualización autorizada de cotizaciones, documentos y vencimientos.

### Criterios de aceptación iniciales

- Desde un cliente se puede crear más de una cotización.
- Cada cotización mantiene monto, moneda y estado independientes.
- Se puede cambiar el estado siguiendo el flujo definido.
- Se pueden crear entregas con porcentaje, monto y fechas.
- La suma de porcentajes no supera el 100 %.
- Se visualiza el total cobrado y el saldo pendiente.
- Los cambios persisten después de recargar.
- Ningún archivo o dato financiero queda expuesto públicamente.
- Las operaciones sensibles quedan preparadas para auditoría.

## Gestión de productos

El flujo de alta se encuentra en **Administración → Productos → Nuevo producto**.

Cada producto admite:

- Empresa e ID de proveedor.
- Nombre, SKU, categoría y unidad de venta.
- Precio y moneda (`UYU` o `USD`).
- Stock y estado (`draft`, `published`, `out_of_stock` o `archived`).
- Tipo de venta (`ready`, `made_to_order` o `custom_quote`).
- Plazo estimado de entrega.
- Dimensiones: ancho, alto y profundidad.
- Producto configurable.
- Variantes con nombre, SKU, precio, stock, medida, color y terminación.
- Descripción comercial.
- Hasta cinco imágenes JPG, PNG o WEBP de hasta 2 MB cada una.
- Listón promocional opcional con texto libre de hasta 24 caracteres.

La primera imagen funciona como portada. Actualmente las imágenes se convierten a Data URL y se guardan en la columna JSONB `images`. Para escalar, se recomienda subir los archivos a Cloudinary, S3, Supabase Storage o un servicio equivalente y guardar únicamente sus URLs.

### Listones promocionales

Cada producto puede mostrar un listón diagonal sobre su fotografía. Se configura al crear o editar el producto mediante los campos **Mostrar listón promocional** y **Texto del listón**.

- La activación es individual por producto.
- El texto es libre y admite hasta 24 caracteres.
- Ejemplos previstos: `50% OFF`, `Exclusivo`, `Nuevo` y `Destacado`.
- El listón aparece en la tarjeta del catálogo y en la galería de la ficha del producto.
- La presentación utiliza el color terracota de la marca, texto en mayúsculas y una inclinación diagonal consistente.
- Si está desactivado o no tiene texto, no se renderiza ningún elemento sobre la imagen.

Los valores se guardan en `products.ribbon_enabled` y `products.ribbon_text`, incorporados por la migración `022_product_ribbons.sql`.

## Buscador, cotización y correo de productos

El cotizador de Mercadobra busca hasta cinco productos relevantes y, después de recibir los datos de contacto, registra la consulta mediante `POST /search-contacts`. Cuando el cliente indica un correo, el backend envía una selección comercial con fichas de producto completas.

Cada ficha del correo incluye:

- Fotografía de portada.
- Nombre del producto y proveedor.
- Descripción breve.
- Precio y unidad de venta.
- Acción directa vinculada al ID exacto del producto.

La etiqueta de la acción depende del tipo y disponibilidad:

| Condición | Acción del correo |
| --- | --- |
| Producto disponible para compra | **Comprar ahora** |
| Proyecto o producto a medida | **Ver y solicitar a medida** |
| Producto sin disponibilidad directa | **Ver producto** |

El frontend envía `selectedProductIds` y una referencia de la imagen de cada resultado. El backend vuelve a resolver los productos por sus IDs, conserva la imagen de portada enriquecida por el catálogo y construye cada URL como `/producto/:id` sobre `FRONTEND_PUBLIC_URL`. Esto evita que una ficha lleve a una búsqueda general o a un artículo diferente.

Las rutas relativas de imágenes se convierten en URLs públicas absolutas antes de generar el HTML del correo. Por eso `FRONTEND_PUBLIC_URL` debe apuntar al dominio público real y no a `localhost` en producción.

Limitaciones conocidas del editor:

- No existe todavía una lista abierta de características técnicas por producto.
- No se pueden reordenar o eliminar fotografías individualmente.
- Seleccionar una galería nueva reemplaza la galería anterior.
- La validación de archivo más completa ocurre en el navegador.
- El modo de catálogo local no debe considerarse persistencia de producción.

## Arquitectura

```text
Navegador
   │
   ├── mercadobra.com ─────────────── Vercel / React + Vite
   │
   └── mercadobra.onrender.com ────── Render / Express
                                            │
                                            └── Render PostgreSQL
```

Directorios principales:

```text
src/                  Frontend React
src/pages/            Pantallas y paneles
src/components/       Componentes compartidos
src/context/          Autenticación, productos, carrito y favoritos
src/lib/api.js        Cliente HTTP del frontend
backend/src/          API, seguridad, repositorio y servicios
backend/src/migrations/ Migraciones SQL versionadas
docs/                 Estado y planificación
```

## Base de datos

Las migraciones `001` a `021` crean y evolucionan el esquema. Las tablas de dominio incluyen:

- `providers`
- `users`
- `products`
- `orders`
- `order_items`
- `notification_logs`
- `leads`
- `quote_consultations`
- `search_contacts`
- `custom_requests`
- `auth_sessions`
- `customer_profiles`
- `customer_quotes`
- `migrations`

El catálogo inicial de Óxida se carga mediante la migración `013_oxida_catalog.sql`. La cuenta administrativa se inserta o actualiza mediante `backend/src/bootstrapAdmin.js`.

Una base nueva recibe la estructura y datos iniciales al ejecutar:

```bash
npm run migrate
npm run db:check
npm run admin:bootstrap
```

Esto no migra automáticamente pedidos, clientes o consultas desde otra instancia PostgreSQL.

### Consideraciones de producción

- No borrar una base anterior sin haber confirmado que no contiene información necesaria.
- Las bases gratuitas de Render expiran y no incluyen backups administrados.
- Antes de aceptar operaciones reales, usar un plan persistente y verificar backups/restauraciones.
- `DATABASE_URL` es un secreto y nunca debe incluirse en commits, documentación o capturas.
- Para una conexión externa de Render puede ser necesario `sslmode=verify-full`.
- Cuando frontend, backend y base pertenecen a la misma cuenta y región, se prefiere la URL interna.

## Variables de entorno

### Frontend — Vercel

```env
VITE_API_BASE_URL=https://mercadobra.onrender.com
```

El valor no debe incluir `/api`, barra final, espacios ni comillas. Después de modificar una variable `VITE_*`, Vercel debe recompilar el frontend porque Vite incorpora estas variables durante el build.

Para desarrollo local:

```env
VITE_API_BASE_URL=http://localhost:4000
```

### Backend — Render

Variables principales:

```env
NODE_ENV=production
FRONTEND_ORIGIN=https://mercadobra.com,https://www.mercadobra.com,https://mercadobra.vercel.app
FRONTEND_PUBLIC_URL=https://mercadobra.com
BACKEND_PUBLIC_URL=https://mercadobra.onrender.com
DATABASE_URL=<URL PostgreSQL>
REQUIRE_DATABASE=true
ADMIN_EMAIL=<email administrador>
ADMIN_PASSWORD=<secreto de al menos 10 caracteres>
ADMIN_COMPANY=Mercadobra
```

Variables opcionales:

- `MERCADOPAGO_ACCESS_TOKEN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (por defecto `mercadobra/products`)
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- Credenciales SMTP o Resend.
- Variables de Meta WhatsApp, Twilio o webhook de WhatsApp.

Si Cloudinary, OpenAI o WhatsApp no están configurados, el backend muestra advertencias informativas, pero puede iniciar normalmente. La carga de nuevas fotos desde administración requiere las tres credenciales de Cloudinary.

### Imágenes de productos — Cloudinary

Las fotos nuevas se optimizan a WebP en el navegador y se envían a `POST /product-images`, una ruta autenticada que realiza la carga en Cloudinary sin exponer `CLOUDINARY_API_SECRET`. La base conserva la URL segura, el identificador público, dimensiones, formato y peso. Las vistas públicas generan variantes responsive de Cloudinary con formato y calidad automáticos.

Después de configurar Cloudinary y verificar una carga nueva, las imágenes Base64 históricas pueden migrarse una sola vez con:

```bash
npm --prefix backend run images:migrate
```

El comando es reanudable: ignora imágenes que ya sean URLs y reemplaza únicamente imágenes Base64. Debe ejecutarse con `DATABASE_URL` apuntando explícitamente a la base que se desea migrar.

Nunca confundir:

- La contraseña incluida en `DATABASE_URL` autentica PostgreSQL.
- `ADMIN_PASSWORD` autentica el acceso al panel administrativo.

## Configuración de despliegue

### Backend en Render

El servicio debe apuntar a `backend/` como Root Directory.

Configuración recomendada cuando no se dispone de Pre-Deploy Command:

```text
Build Command:
npm ci

Start Command:
npm run migrate && npm run costs:seed && npm run db:check && npm run admin:bootstrap && node src/server.js
```

En un servicio que permita Pre-Deploy Command:

```text
Build Command:
npm ci

Pre-Deploy Command:
npm run migrate && npm run costs:seed && npm run db:check && npm run admin:bootstrap

Start Command:
node src/server.js
```

Señales de un inicio correcto:

```text
DB OK. Tablas verificadas: ...
Usuario administrador verificado.
Mercadobra backend listening on http://localhost:10000
```

Endpoints de diagnóstico:

- `GET https://mercadobra.onrender.com/health`
- `GET https://mercadobra.onrender.com/products`

El backend configura `trust proxy = 1` en producción antes de instalar los limitadores de solicitudes. Render entrega el tráfico mediante un proxy inverso y agrega `X-Forwarded-For`; confiar únicamente en el salto más cercano permite que Express y `express-rate-limit` identifiquen la IP del cliente sin aceptar una cadena de proxies de forma irrestricta. No se debe desactivar la validación `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.

### Frontend en Vercel

1. Configurar `VITE_API_BASE_URL` para Production, Preview y Development.
2. Ejecutar Redeploy sin reutilizar el build cache después de cambiar variables.
3. Confirmar que el deployment figure como Ready.
4. Probar el sitio en una ventana privada para descartar recursos cacheados.

## Autenticación y seguridad

- Contraseñas cifradas con `scrypt` y salt aleatorio.
- Sesiones aleatorias almacenadas como hash y con vencimiento.
- Separación de roles `customer`, `provider` y `admin`.
- Rutas administrativas protegidas tanto en frontend como en backend.
- Limitación de intentos sobre endpoints de autenticación.
- CORS restringido a los orígenes configurados.

Después de varios intentos fallidos, el backend devuelve `429` y bloquea temporalmente la IP. Actualmente el frontend puede presentar ese caso como un error genérico de conexión; debe mejorarse para mostrar el mensaje real y el tiempo de espera.

Al reemplazar la base de datos, las sesiones antiguas dejan de ser válidas y todos los perfiles deben iniciar sesión nuevamente. Los clientes no migrados deben volver a registrarse.

## Desarrollo local

Requisitos:

- Node.js 22 recomendado.
- npm.
- PostgreSQL opcional para desarrollo; sin `DATABASE_URL` existe un store JSON local.

Instalación y ejecución:

```bash
npm install
npm --prefix backend install
npm run dev:all
```

Frontend por separado:

```bash
npm run dev
```

Backend por separado:

```bash
npm run dev:backend
```

Copiar los archivos de ejemplo antes de iniciar:

```text
.env.example → .env
backend/.env.example → backend/.env
```

## Scripts útiles

- `npm run dev`: frontend Vite.
- `npm run dev:backend`: backend con entorno de desarrollo.
- `npm run dev:all`: frontend y backend juntos.
- `npm run build`: build de producción del frontend.
- `npm run lint`: análisis estático.
- `npm run start:backend`: backend sin modo watch.
- `npm run db:bootstrap`: migraciones y seed de PostgreSQL.
- `npm run db:check`: valida conexión y tablas mínimas.
- `npm run preflight`: chequeo rápido de base.
- `npm --prefix backend run migrate`: aplica migraciones pendientes.
- `npm --prefix backend run admin:bootstrap`: crea o actualiza el administrador configurado.

## Endpoints principales

### Autenticación

- `POST /auth/login`
- `POST /auth/customer/login`
- `POST /auth/customer/register`
- `POST /auth/admin/login`
- `POST /auth/logout`

### Catálogo

- `GET /providers`
- `GET /providers/:id/products`
- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PATCH /products/:id`
- `DELETE /products/:id`

### Operación comercial

- `POST /orders`
- `GET /orders`
- `GET /orders/track/:trackingToken?phone=...`
- `PATCH /orders/:id/status`
- `GET /orders/:id/notifications`
- `POST /leads`
- `POST /search-contacts`
- `POST /chat`

### Pagos

- `POST /payments/mercadopago/checkout`
- `POST /payments/mercadopago/webhook`

## Avances completados

- Home y navegación responsive.
- Catálogo conectado al backend.
- Ficha profesional de producto.
- Galería, stock, plazos, compra y cotización.
- Carrito persistente con revalidación.
- Checkout y seguimiento de pedidos.
- Snapshot comercial en órdenes.
- Gestión administrativa de pedidos.
- Alta y edición administrativa de productos.
- Solicitudes de personalización y consultas.
- Autenticación segura y sesiones revocables.
- Accesos separados para clientes, proveedores y administradores.
- Acceso administrativo discreto en el pie de página.
- Menú principal restaurado y estable con Inicio, Quiénes somos, Óxida Studio y Contáctenos.
- Accesos públicos de cliente y proveedor preservados, pero temporalmente ocultos en el encabezado.
- Producción conectada a una nueva instancia PostgreSQL y esquema versionado.
- Primera versión administrativa de clientes con perfiles editables y estados de cuenta.
- Detalle comercial por cliente con primera etapa de cotizaciones, montos, monedas, fechas y estados.
- CORS habilitado para dominio principal, variante `www` y Vercel.
- Óxida presenta Projects, Pro, Custom Works, Collection y Care como un sistema editorial de capacidades integrado a su identidad visual.
- Las capacidades de Óxida incluyen diseño y dirección de obra, ingeniería estructural, ejecución y fabricación especializada, además de mantenimiento de estructuras y parrilleros.
- Inicio y Óxida comparten una barra editorial de unidades con anclas directas a cada segmento.
- Buscador/cotizador reposicionado alrededor de productos y soluciones en hierro con el mensaje “Lo que imaginás, en hierro”.
- Correos del cotizador convertidos en fichas directas con fotografía, descripción, precio y acción sobre el producto exacto.
- Listones promocionales diagonales configurables por producto desde el panel administrativo.
- Edición administrativa priorizando siempre la sesión de administrador aunque exista además una sesión de proveedor.
- Baja segura de productos mediante archivado, conservando referencias e historial de pedidos.
- Los productos archivados se excluyen de las respuestas públicas del catálogo y no reaparecen al recargar la web.
- El catálogo local `INITIAL_PRODUCTS` se utiliza únicamente si falla toda la API. Cuando la API responde, su lista es la fuente de verdad y los productos locales faltantes no se reinsertan.
- Cuando hay una sesión administrativa, las tarjetas de `/explorar` muestran acciones directas para editar y eliminar cada producto, además de las disponibles en `/admin/productos`.
- Escritura de marca normalizada como Mercadobra y Óxida Studio en textos públicos, comunicaciones y documentación.
- Portada simplificada: se retiraron los bloques redundantes “Comprar por categoría” y “Todo para transformar tu espacio”.
- Página de contacto ampliada con formulario de nombre, email, teléfono, empresa, motivo y comentarios; registra la consulta comercial y notifica al equipo mediante el flujo existente de leads.
- Las consultas enviadas desde `/contacto` llegan a `contacto@mercadobra.com`; el correo usa la dirección del cliente como `Reply-To` para responder directamente.
- El editor de productos informa específicamente cuando un SKU ya existe o cuando el ID de proveedor no corresponde a un proveedor registrado; los SKU archivados permanecen reservados para conservar el historial.
- Portada editorial configurable desde cada producto: hasta cuatro diapositivas automáticas debajo del cotizador, usando la foto de portada y mostrando únicamente un título de impacto y un subtítulo.
- El carrusel editorial avanza continuamente cada 4,8 segundos y ofrece flechas laterales y navegación inferior; no se detiene por dejar el cursor sobre la imagen.
- La acción principal **Ver la colección** abre `/explorar#catalog-results`, directamente en el listado de productos.
- El catálogo `/explorar` se simplificó para mostrar directamente los productos, sin filtros de categoría, ordenamiento, combos ni comparador.
- Los cuatro pasos del proceso Óxida comparten una grilla vertical para alinear números, títulos y descripciones independientemente de la extensión del texto.
- La acción **Contanos tu idea** abre `/contacto#formulario-contacto` y desplaza la vista directamente al formulario.

## Auditoría integral de ecommerce — 12 de agosto de 2026

**Objetivo:** identificar la distancia entre la versión operativa y un ecommerce profesional de excelencia. Esta auditoría revisó rutas, componentes, API, catálogo real, checkout, pagos, seguimiento, administración, seguridad, contenido, SEO y operación. No reemplaza una sesión formal de Lighthouse, pruebas con usuarios, auditoría legal ni revisión WCAG manual con tecnologías de asistencia.

### Evidencia verificada en producción

| Área | Resultado observado |
| --- | --- |
| Disponibilidad | Frontend y backend responden correctamente mediante Vercel y Render. |
| Pagos | Mercado Pago está habilitado y en modo producción, no sandbox. |
| Catálogo | 10 productos publicados; todos tienen una imagen y precios en USD. |
| Rendimiento de datos | `GET /products` pesa aproximadamente **1,76 MB** porque las imágenes se entregan como Data URL dentro del JSON. |
| Seguridad HTTP | Backend con Helmet, HSTS, CSP, protección MIME, rate limiting y proxy de Render configurado. |
| Compra | Carrito persistente, revalidación de precio/stock, checkout, transferencia, Mercado Pago y seguimiento por token. |
| Operación | Administración de productos, pedidos, clientes, consultas, personalizaciones y cotizaciones. |
| Indexación | El HTML inicial contiene solo el contenedor React; no hay metadata comercial completa, sitemap, robots ni datos estructurados. |
| Calidad automatizada | No existen pruebas unitarias, de integración o end-to-end configuradas en el repositorio. |

### Regla transitoria de entrega — implementada mientras no existan tarifas

- **Retiro acordado:** permite transferencia o Mercado Pago porque el total es conocido antes de cobrar.
- **Entrega a domicilio:** registra el pedido sin cobrar; Mercadobra cotiza el envío y comunica el total final antes de solicitar el pago.
- El checkout denomina el importe como **Subtotal de productos**, muestra que el envío está pendiente y utiliza **Pago después de confirmar el envío**.
- El backend impide pagar por Mercado Pago una entrega cuyo costo todavía no está definido, aunque se intente llamar directamente a la API.
- Esta solución evita cobrar un total incompleto; cuando existan tarifas deberá reemplazarse por reglas de zona, cobertura y costo administrables.

### Fortalezas actuales

- Identidad visual propia y consistente entre Mercadobra y Óxida Studio.
- Portada editorial configurable y catálogo conectado a PostgreSQL.
- Ficha con galería, precio, stock, plazo, modalidad de venta, dimensiones y variantes.
- Carrito persistente que vuelve a validar precio, publicación y disponibilidad antes de cobrar.
- Flujo real de Mercado Pago con webhook, estados de retorno y restauración de stock ante pagos rechazados o cancelados.
- Compra alternativa por transferencia y atención directa por WhatsApp.
- Seguimiento público protegido mediante token y teléfono del comprador.
- Baja segura de productos mediante archivado, sin romper pedidos históricos.
- Autenticación por roles, contraseñas cifradas y sesiones revocables.
- Formularios comerciales conectados a administración y correo.
- Interfaz responsive con estados de carga, éxito, vacío y error en los flujos principales.

### P0 — imprescindible antes de escalar ventas

| Brecha | Riesgo actual | Resultado requerido |
| --- | --- | --- |
| **Entrega sin precio cerrado** | El checkout muestra “A confirmar”, pero el resumen dice “Total a pagar ahora” sin incorporar envío. Puede generar expectativas incorrectas antes de Mercado Pago. | Definir zonas, costo, retiro, cobertura y fecha estimada antes del pago; bloquear Mercado Pago cuando el total final aún no esté cerrado. |
| **Políticas legales inexistentes** | No hay Términos, Privacidad, Cookies, Entregas, Cambios/Devoluciones, Garantías ni condiciones para productos personalizados. | Publicar páginas legales revisadas para Uruguay, enlazarlas en footer y exigir aceptación en checkout cuando corresponda. |
| **Imágenes almacenadas en PostgreSQL** | La API ya evita transportar Base64 en el listado y sirve las imágenes mediante URLs cacheables; sin embargo, los archivos históricos todavía ocupan la base de datos. | Migrar a almacenamiento de objetos/CDN, guardar URLs, generar miniaturas y `srcset`, y retirar los binarios históricos de PostgreSQL. |
| **Carrito multimoneda inseguro** | El total suma todos los artículos y usa la moneda del primer producto. Si conviven UYU y USD, el total sería incorrecto. | Impedir mezclar monedas o convertir con una cotización fijada y auditable antes de agregar/pagar. |
| **Confirmación al comprador** | Las notificaciones dependen principalmente de WhatsApp; no existe una garantía visible de email transaccional de pedido, pago y despacho. | Enviar email transaccional idempotente para pedido recibido, pago aprobado/rechazado, despacho y entrega; registrar entregas y reintentos. |
| **Sin pruebas de compra** | Cambios frecuentes pueden romper publicación, carrito, stock, pago, webhook o eliminación sin detectarse. | Cubrir producto→carrito→checkout→pago→webhook→seguimiento con pruebas de integración y E2E ejecutadas antes de desplegar. |
| **Sin backups/recuperación demostrada** | La continuidad depende de una única base y no hay RPO/RTO documentados ni restauración ensayada. | Backups automáticos, retención, exportación, restauración probada y procedimiento de incidente. |

### P1 — conversión, confianza y descubrimiento

#### Catálogo y ficha de producto

- Definir un estándar editorial mínimo por producto: 4–8 fotos optimizadas, vista de escala, detalle de material, terminación y contexto de uso.
- Incorporar características técnicas flexibles con unidades claras; traducir etiquetas internas como `width`, `height` y `depth`.
- Agregar disponibilidad real por variante, no solo stock agregado del producto.
- Mostrar fecha estimada de entrega según producto, variante, destino y modalidad.
- Explicar garantía, cuidados, materiales, armado/instalación, contenido del paquete y política de fabricación a pedido.
- Incorporar zoom o lightbox accesible para las imágenes.
- Corregir calidad editorial de nombres, tildes, dobles espacios, unidades y consistencia de marca antes de publicar.
- Definir productos agotados: ocultar, permitir aviso de reposición o convertir en consulta, sin mensajes ambiguos.
- Agregar recomendaciones basadas en colección, uso o compatibilidad; hoy dependen únicamente de la categoría.

#### Checkout y pago

- Convertir el carrito lateral en un checkout con URL propia y estado recuperable para reducir pérdidas al recargar o volver desde Mercado Pago.
- Autocompletar datos cuando exista sesión de cliente y permitir editar dirección/contacto.
- Mostrar resumen final inmutable: artículos, variantes, descuentos, envío, moneda, total y plazo antes de confirmar.
- Añadir cupones/promociones con reglas de vigencia, uso, moneda, stock y auditoría.
- Guardar consentimiento de políticas y versión legal aceptada.
- Manejar formalmente devoluciones, cancelaciones, reembolsos parciales/totales y contracargos desde administración.
- Probar idempotencia de creación de orden y webhook para impedir pedidos o descuentos de stock duplicados.
- Mostrar medios y cuotas reales informados por Mercado Pago, evitando promesas genéricas no verificadas.

#### Confianza y contenido comercial

- Añadir bloque visible de entrega, garantía, cambios, pagos seguros y atención posventa cerca del CTA.
- Incorporar reseñas verificadas, proyectos entregados o testimonios reales con autorización; no usar métricas ficticias.
- Mostrar razón social, domicilio comercial cuando corresponda, canales de soporte, horarios y tiempos de respuesta.
- Crear preguntas frecuentes sobre compra, fabricación, medidas, instalación, entrega y mantenimiento.
- Añadir prueba social visual: proyectos reales, detalles de fabricación, proceso y equipo.
- Mantener separados “producto comprable” y “trabajo a cotizar” para que precio, CTA y expectativa sean inequívocos.

#### SEO y adquisición

- Cambiar `lang="en"` por `lang="es-UY"` y definir títulos/descripciones únicos por ruta.
- Incorporar canonical, Open Graph, Twitter Cards, favicon completo, manifest y color de interfaz.
- Publicar `robots.txt` y sitemap dinámico con productos y páginas públicas.
- Añadir JSON-LD `Organization`, `WebSite`, `BreadcrumbList`, `Product` y `Offer`, con precio, moneda, stock e imagen correctos.
- Resolver renderizado indexable mediante prerender/SSR o generación estática de páginas de producto; el HTML inicial actual no contiene contenido comercial.
- Crear URLs o slugs legibles y redirecciones permanentes, manteniendo compatibilidad con IDs históricos.
- Añadir páginas de colección/categoría solo cuando tengan contenido editorial útil; no reintroducir filtros vacíos o sin valor.
- Implementar Search Console y validación periódica de indexación, errores y rich results.

#### Cuenta del cliente y retención

- Crear `/cliente` con perfil, direcciones, pedidos, estados, comprobantes, cotizaciones y recompra.
- Implementar recuperación/cambio de contraseña y verificación de email.
- Vincular automáticamente órdenes de invitado con una cuenta verificada sin exponer historial por coincidencia insegura.
- Sincronizar favoritos y carrito con la cuenta; hoy viven solo en `localStorage`.
- Incorporar aviso de reposición, seguimiento posventa y solicitud de reseña.
- Diseñar recuperación de carrito abandonado únicamente con consentimiento y reglas de frecuencia.

### P1 — operación y administración

- Eliminar el “éxito offline” en operaciones administrativas: nunca afirmar que un producto quedó guardado si la API falló.
- Sustituir el ID numérico manual de proveedor por un selector con búsqueda y validación.
- Añadir gestión de inventario por movimientos: ajuste, reserva, venta, cancelación, devolución y responsable.
- Incorporar edición masiva, importación/exportación CSV, duplicado de producto y previsualización antes de publicar.
- Permitir reordenar/eliminar fotos individualmente y definir texto alternativo desde administración.
- Crear reglas administrables de envío, promociones, impuestos, garantía y métodos de pago.
- Añadir historial de cambios para productos, precios, stock, pedidos, clientes, pagos y estados.
- Completar documentos, entregas, pagos parciales y trazabilidad de cotizaciones/proyectos.
- Agregar paginación y filtros del lado del servidor antes de crecer en productos, clientes, pedidos y consultas.
- Separar roles internos: administrador, ventas, operaciones, contenido y soporte, con permisos mínimos.

### P1 — observabilidad, seguridad y calidad

- Integrar monitoreo de errores frontend/backend con alertas y contexto de versión.
- Incorporar logs estructurados con correlación entre checkout, orden, pago, webhook y notificación, sin datos sensibles innecesarios.
- Añadir métricas de latencia, errores, disponibilidad, colas de correo y webhooks fallidos.
- Migrar sesiones del navegador desde `localStorage` hacia cookies `HttpOnly`, `Secure` y `SameSite`, con protección CSRF donde corresponda.
- Configurar rate limiting compartido si Render escala a varias instancias; el store en memoria no coordina límites entre procesos.
- Definir retención, minimización y eliminación de datos personales según política publicada.
- Revisar CSP al migrar imágenes a CDN y limitar orígenes de forma explícita.
- Ejecutar escaneo de dependencias, secretos y vulnerabilidades en CI.
- Corregir el tratamiento visible de respuestas `429`, expiración de sesión y errores transitorios.

### P2 — experiencia de excelencia

- Medición de embudo: vista de producto, agregar al carrito, iniciar checkout, elegir pago, compra aprobada y abandono.
- Panel de negocio con conversión, ingresos, ticket promedio, margen, productos, consultas y origen comercial.
- Experimentos controlados sobre CTA, confianza, fotografía, checkout y contenido; no cambiar por intuición sin medir.
- Búsqueda comercial con sinónimos, tolerancia, sugerencias y resultados indexables cuando el catálogo lo justifique.
- Personalización prudente según comportamiento y disponibilidad, sin crear burbujas ni usar datos sin consentimiento.
- Wishlist compartible, listas de proyecto y cotización desde carrito.
- Accesibilidad WCAG 2.2 AA: auditoría de teclado, foco, lector de pantalla, contraste, zoom, errores y objetivos táctiles.
- Respetar `prefers-reduced-motion` en carruseles, transiciones y desplazamientos suaves.
- Internacionalización preparada para moneda, impuestos, formatos y expansión regional, aunque inicialmente opere solo en Uruguay.
- PWA solo si aporta una necesidad real de operación o recompra; no priorizarla sobre rendimiento, SEO y checkout.

### Calidad y rendimiento objetivo

| Indicador | Objetivo inicial |
| --- | --- |
| Disponibilidad mensual | ≥ 99,9 % para frontend, API y checkout. |
| LCP móvil p75 | ≤ 2,5 s. |
| INP móvil p75 | ≤ 200 ms. |
| CLS p75 | ≤ 0,1. |
| Respuesta inicial de catálogo | < 200 KB sin imágenes embebidas. |
| Imágenes de tarjeta | Preferentemente < 120 KB, responsive y lazy-loaded. |
| Errores de checkout | < 1 % excluyendo rechazos legítimos del medio de pago. |
| Confirmación transaccional | Enviada y registrada en < 60 s. |
| Cobertura crítica | 100 % de los caminos de compra principales cubiertos por E2E. |
| Accesibilidad | Sin bloqueos críticos WCAG 2.2 AA. |

### Plan recomendado

1. **Fundación comercial:** envío con total cerrado, legales, email transaccional, moneda segura y backups.
2. **Rendimiento y SEO:** CDN de imágenes, metadata, sitemap, datos estructurados y renderizado indexable.
3. **Calidad de compra:** pruebas E2E, checkout recuperable, variantes/stock y políticas visibles.
4. **Confianza y retención:** cuenta completa, comprobantes, reseñas verificadas, FAQ y posventa.
5. **Escala operativa:** auditoría, inventario por movimientos, envíos/promociones administrables y roles.
6. **Optimización continua:** analytics, monitoreo, métricas de negocio, accesibilidad y experimentación.

### Criterio de salida para considerarlo “ecommerce de excelencia”

- El comprador conoce producto, variante, entrega, garantía, moneda y total final antes de pagar.
- La compra completa funciona de extremo a extremo y puede recuperarse sin intervención manual.
- Cada operación crítica es idempotente, observable, auditable y está cubierta por pruebas.
- El sitio carga rápido en móvil, es indexable y cumple WCAG 2.2 AA sin bloqueos críticos.
- Las fotografías, textos y especificaciones cumplen un estándar editorial uniforme.
- Existen políticas claras, soporte visible y comunicaciones transaccionales confiables.
- Administración puede operar catálogo, inventario, pedidos, pagos, devoluciones y clientes sin tocar código o base de datos.
- El negocio puede medir conversión, ingresos, abandono, cumplimiento de entrega y satisfacción.

## OXI Cotiza — cotizador paramétrico

**Objetivo:** crear una herramienta paralela a OXI Modela para presupuestar productos y trabajos fabricables mediante variables, fórmulas, materiales, procesos y reglas comerciales administrables.

OXI Modela seguirá enfocado en espacios, ambientes y documentación 2D/3D. OXI Cotiza resolverá objetos y trabajos como mesas, parrilleros, cercos, pérgolas, escaleras y estructuras personalizadas. Ambos módulos podrán intercambiar cantidades en el futuro, pero no compartirán editor ni dependerán uno del otro para funcionar.

### Principio de cálculo

El precio se determina con un motor matemático, determinístico, versionado y auditable. La inteligencia artificial no calcula ni decide por sí sola el precio final.

- Las entradas son medidas, cantidades, opciones de diseño, materiales, procesos y condiciones del proyecto.
- Las fórmulas convierten las entradas en superficies, longitudes, pesos, consumos, horas y subtotales.
- Los precios unitarios y rendimientos provienen de un catálogo administrable.
- Las reglas comerciales incorporan desperdicio, transporte, gastos generales, utilidad, impuestos y ajustes autorizados.
- Cada cotización enviada conserva una copia histórica de entradas, fórmulas, precios y reglas para no cambiar cuando se actualice el catálogo.
- Todo ajuste manual debe guardar valor anterior, valor nuevo, motivo, fecha y responsable.

La IA será una capa de asistencia opcional. Podrá interpretar una descripción del cliente, sugerir una plantilla, proponer variables faltantes, detectar incoherencias, explicar el cálculo o redactar la propuesta. Sus sugerencias deberán convertirse en datos estructurados y ser confirmadas por una persona antes de afectar una cotización.

### Modelo funcional

#### Catálogo de variables

Cada variable deberá tener:

- Código estable y único.
- Nombre, descripción y categoría.
- Tipo: precio, rendimiento, porcentaje, constante o regla comercial.
- Unidad de entrada y unidad de referencia.
- Valor, moneda, proveedor o fuente y fecha de actualización.
- Vigencia desde/hasta, estado y número de versión.
- Desperdicio recomendado y notas técnicas cuando corresponda.
- Historial completo de modificaciones.

El panel administrativo permitirá editar variables individualmente, publicar una nueva versión e importar actualizaciones masivas desde un archivo validado. Una importación deberá mostrar diferencias antes de aplicarse y nunca sobrescribir cotizaciones históricas.

#### Plantillas paramétricas

Cada familia de producto tendrá una plantilla versionada compuesta por:

- Datos generales y alcance de uso.
- Campos de entrada con tipo, unidad, límites, valor inicial y obligatoriedad.
- Opciones condicionales que muestran u ocultan variables según el diseño elegido.
- Variables derivadas calculadas mediante fórmulas seguras.
- Lista de materiales y consumibles.
- Operaciones de taller, terminación, transporte y montaje.
- Advertencias, supuestos y datos pendientes de confirmar.
- Reglas de presentación comercial y exclusión de costos internos.

Ejemplo inicial, **mesa circular**:

```text
area_tapa = PI * (diametro_m / 2) ^ 2
perimetro_tapa = PI * diametro_m
longitud_patas = altura_m * cantidad_patas
costo_linea = cantidad * precio_unitario * (1 + desperdicio)
costo_directo = materiales + consumibles + mano_obra + procesos + transporte
costo_completo = costo_directo * (1 + gastos_generales)
precio_antes_iva = costo_completo / (1 - margen_bruto_objetivo)
precio_final = precio_antes_iva * (1 + iva)
```

La rentabilidad se define como **margen bruto sobre el precio de venta antes de IVA**, no como recargo sobre costo. El valor inicial de referencia será 35%. Por ejemplo, un costo completo de $100 con un margen bruto objetivo de 35% produce un precio antes de IVA de $153,85. Los gastos generales forman parte del costo completo; el IVA se aplica después de calcular el precio de venta.

#### Motor de fórmulas

- Aceptará únicamente operadores y funciones aprobados; nunca ejecutará código ingresado por el usuario.
- Validará unidades, dependencias, divisiones por cero, ciclos y valores fuera de rango.
- Mostrará el desglose y la procedencia de cada resultado para permitir auditoría.
- Ejecutará los mismos casos de prueba en frontend y backend, pero el backend será la fuente autoritativa del precio.
- Guardará versión de plantilla, versión de variables y resultado detallado utilizado en cada cálculo.

#### Cotización comercial

El flujo administrativo será:

1. Seleccionar cliente y plantilla.
2. Completar variables de diseño y confirmar supuestos.
3. Revisar materiales, procesos, cantidades y advertencias.
4. Calcular el costo interno y aplicar reglas comerciales.
5. Autorizar ajustes manuales con motivo.
6. Previsualizar la propuesta sin información sensible de costos.
7. Guardar borrador, enviar, descargar PDF y registrar aceptación o rechazo.
8. Configurar seña y convertir la cotización aceptada en proyecto.

Estados propuestos: **borrador**, **calculada**, **en revisión**, **enviada**, **vista**, **aceptada**, **rechazada**, **vencida** y **convertida en proyecto**.

### Arquitectura de datos propuesta

| Entidad | Responsabilidad |
| --- | --- |
| `cost_variables` | Identidad y metadatos estables de materiales, rendimientos e indirectos. |
| `cost_variable_versions` | Valor, moneda, fuente y vigencia de cada actualización. |
| `quote_templates` | Familias de productos y versiones publicadas. |
| `quote_template_inputs` | Variables solicitadas al usuario y condiciones de visibilidad. |
| `quote_template_lines` | Fórmulas de cantidades, recursos y procesos que forman el costo. |
| `quote_calculations` | Resultado detallado de cada ejecución del motor. |
| `quote_snapshots` | Copia inmutable utilizada al enviar una propuesta. |
| `quote_adjustments` | Ajustes manuales auditados y su justificación. |

### Experiencia de administración

La interfaz de escritorio se dividirá en:

- **Variables:** catálogo, filtros, actualización, vigencia e historial.
- **Plantillas:** campos, reglas condicionales, fórmulas y pruebas de ejemplo.
- **Cotizador:** entradas a la izquierda, desglose técnico en el centro y resumen económico a la derecha.
- **Importaciones:** comparación, validaciones, errores y aprobación de cambios masivos.
- **Cotizaciones:** borradores, revisiones, documentos, mensajes, señas y seguimiento.

En móvil, la creación se presentará como pasos consecutivos. Los costos internos, rendimientos, utilidad y proveedores nunca se expondrán en la propuesta pública.

### Plan de implementación

#### Orden de ejecución

El desarrollo se realizará en este orden. No se iniciará una etapa posterior hasta verificar los criterios de la anterior, salvo trabajo técnico independiente que no comprometa decisiones pendientes.

1. **Normalizar el archivo de variables.** Crear un inventario estructurado con código, categoría, unidad, tipo, valor, moneda, fuente, vigencia y estado de confirmación. Separar variables reutilizables de datos exclusivos de un proyecto.
2. **Cerrar las reglas económicas.** Confirmar margen bruto, gastos generales, IVA, tratamiento del flete, moneda, precisión y redondeos. El margen bruto ya fue definido en 35% sobre venta antes de IVA.
3. **Construir la base técnica.** Crear tablas y migraciones para variables, versiones, plantillas, cálculos, snapshots y ajustes auditados.
4. **Implementar el motor matemático.** Resolver entradas, cantidades, costos, gastos generales, margen e IVA en el backend, con desglose explicable y pruebas automatizadas.
5. **Crear la mesa circular como caso piloto.** Definir diámetro, altura, tapa, base, perfil, terminación, cantidad, transporte y montaje; validar el resultado contra un presupuesto manual conocido.
6. **Diseñar la interfaz administrativa.** Construir catálogo de variables, editor de cotización, desglose técnico y resumen comercial sobre el motor ya verificado.
7. **Integrar el flujo comercial.** Conectar clientes, PDF, envío, aceptación, seña, conversión a proyecto e historial inmutable.
8. **Incorporar nuevas plantillas e IA asistiva.** Extender productos y agregar interpretación, detección de faltantes y redacción revisable sin delegar el precio final a la IA.

**Paso activo:** primera plantilla operativa de OXI Cotiza. El panel `/admin/cotiza` ya permite calcular una mesa circular piloto desde medidas, 81 variables versionadas, flete y tipo de cambio confirmado manualmente. El backend arma el desglose y aplica gastos generales, margen bruto e IVA. Los supuestos de materiales, rendimientos y terminación todavía deben validarse contra un presupuesto manual antes de usar el resultado como propuesta comercial.

#### Fase 0 — normalización y decisiones

- [x] Clasificar las variables con nombre como reutilizables y separar las cantidades de Casa J como datos específicos de plantilla/cotización.
- [x] Generar catálogo inicial con códigos, categorías, unidades, moneda, fórmulas de origen y fuente; queda pendiente aprobar las unidades canónicas al crear el importador.
- [x] Definir la rentabilidad como margen bruto sobre venta antes de IVA: costo completo dividido entre `1 - margen`; aplicar IVA al final.
- [x] Definir moneda: costos base en UYU, propuesta comercial en USD y cotización UYU/USD versionada dentro de cada presupuesto.
- [x] Definir fuente cambiaria inicial: pizarra oficial del BROU, Dólar / Compra, actualizada diariamente y confirmada manualmente al emitir.
- [ ] Identificar estimaciones y variables que requieren confirmación técnica.
- [ ] Preparar casos de prueba con resultados esperados.

#### Fase 1 — motor y catálogo

- [x] Crear migraciones para variables, versiones, tipo de cambio y auditoría.
- [x] Crear un importador validado e idempotente para la carga inicial de 81 variables.
- [x] Implementar el núcleo determinístico de líneas de costo, desperdicio, gastos generales, margen bruto, dólar BROU e IVA, con pruebas unitarias.
- [x] Implementar el evaluador seguro de fórmulas y unidades para plantillas paramétricas.
- [ ] Cubrir cálculos, versiones, redondeos y errores con pruebas automatizadas.
- [x] Crear la administración básica de variables y precios.

#### Fase 2 — primera plantilla operativa

- [x] Implementar la plantilla paramétrica piloto de mesa circular.
- [x] Incorporar diámetro, altura, tapa, base, perfil, terminación y cantidad.
- [x] Calcular materiales, consumibles, operaciones, desperdicio e indirectos.
- [x] Mostrar desglose técnico, advertencias y resumen comercial.
- [ ] Validar el resultado contra un presupuesto manual conocido.

#### Fase 3 — flujo comercial

- [x] Integrar el cálculo con clientes y cotizaciones existentes.
- [ ] Guardar snapshots inmutables al enviar.
- [x] Incorporar previsualización, PDF, vigencia, condiciones, seña y aceptación.
- [x] Registrar eventos de envío, vista y decisión del cliente.

#### Fase 4 — Plantillas Paramétricas y Escalabilidad Internacional (Camino A)

**Objetivo:** Eliminar el código duro (hardcoding) de las fórmulas matemáticas para permitir escalabilidad a nuevos productos y expansión a otros países de forma 100% independiente de ingeniería.

- [x] **Constructor Visual de Plantillas:** Interfaz gráfica en `/admin/plantillas` para que la administración cree nuevos productos desde cero, defina sus variables de entrada (Largo, Alto, Cantidad) y escriba fórmulas matemáticas (Ej: `(Largo * Alto) * 0.5`).
- [ ] **Agnosticismo de Moneda y Región:** Desacoplar las fórmulas de monedas específicas (UYU/USD) o de catálogos locales, permitiendo crear "Regiones" (Ej: Chile) con sus propias tablas de variables, impuestos (IVA/VAT) y multiplicadores de riesgo.
- [ ] **Administración Internacional:** Permitir que los precios de catálogo y las reglas de flete se configuren por país o zona operativa, haciendo que el mismo motor `OXI Cotiza` sirva globalmente.
- [ ] Agregar importación masiva con vista previa y rollback lógico para actualizar listas de precios de acero de forma segura.
- [x] Extender el catálogo de plantillas iniciales sin intervención de programación (mesas rectangulares, parrilleros, cercos, pérgolas y aberturas).
- [ ] Incorporar permisos separados: Editores de Fórmulas (Ingeniería) vs. Generadores de Propuestas (Comercial).

#### Fase 5 — Analítica e Inteligencia Artificial (IA)

**Objetivo:** Transformar a OXI OS en un sistema experto y predictivo, acelerando la entrada de datos, previniendo errores humanos y explotando el valor de los datos históricos.

- [x] **Prioridad 1: Extracción con IA (Smart Parsing):** Interpretar texto desestructurado (emails) o archivos PDF/planos subidos por la constructora para proponer automáticamente parámetros estructurados en el cotizador (ej: extraer "Baranda", "30m", "Hierro negro").
- [x] **Prioridad 2: Redacción Automática de Propuestas (Auto-Scope):** Generar automáticamente con un LLM el documento comercial (alcance, supuestos, exclusiones y garantías) basado en la complejidad de las variables calculadas, listo para su revisión final.
- [x] **Prioridad 3: Detección de Anomalías (AI Auditor):** Auditor silencioso en `/admin/cotiza` para auditar cada cálculo y alertar si los consumos (ratio de horas/kg, % de desperdicio) se desvían de los rangos esperados.
- [x] **Prioridad 4: Analítica de Negocio (Dashboard de Proyectos):** Dashboard ejecutivo en `/admin/analytics` con gráficos interactivos (Recharts) de GMV, embudo de cotizaciones y facturación.
- [ ] Incorporar el feedback loop: Medir precisión de las sugerencias de la IA para retroalimentar el modelo y exigir siempre confirmación humana ("Human in the loop") antes de enviar.

#### Fase 6 — Plataforma OxI B2B (Clásico & Pro Suite)

**Objetivo:** Brindar a Constructoras y Estudios de Arquitectura una experiencia de seguimiento operativo (OxI Clásico) y una suite avanzada de ingeniería y costos de obra (OxI Pro).

- [x] **Plataforma OxI Clásico:**
  - [x] Dashboard corporativo en `/cliente` con selector de obra y tablero Kanban de 3 estados (Solicitadas, En Proceso, Finalizadas).
  - [x] Formulario de cotización de herrería y piezas con carga clasificada de documentación (planos CAD/PDF, memorias descriptivas y fotos de obra).
  - [x] Trazabilidad visual de 5 etapas (Solicitud -> Cotizada -> Aceptada -> En ejecución -> Finalizada).
  - [x] Hilo de mensajería técnica en tiempo real por cotización con el equipo de ingeniería de Óxida.
- [x] **Suite OxI Pro (Los 4 Pilares de Control de Obra):**
  - [x] **Pilar 1 — Carga y Gestión de Proyectos:**
    - Conmutador directo de obras en el encabezado de OxI Pro y selector lateral.
    - Persistencia reactiva aislada por obra (`localStorage` key dinámico por `projectId`).
    - Vinculación relacional estricta en PostgreSQL (`b2b_project_id` en `customer_quotes` y `fabrication_orders`).
  - [x] **Pilar 2 — Schedule / Cronograma Gantt & Recursos:**
    - Asignación de cuadrillas y operarios por categoría salarial (Capataz, Oficial Especializado, Oficial, Medio Oficial, Peón Práctico).
    - Calculador dinámico de días hábiles entre fechas de inicio y fin con cómputo de mano de obra en vivo.
    - Pills de estado en vivo (`✓ Terminado`, `⚡ En curso`, `⏳ Pendiente`) con control de progreso editable.
    - Exportación a planilla Excel mediante `📥 Exportar Cronograma (CSV)` con UTF-8 BOM.
  - [x] **Pilar 3 — Presupuestos vs. Ejecutados & Curva S:**
    - Partidas presupuestarias editables y personalizadas mediante modal `＋ Agregar Rubro / Partida`.
    - Detección de desviaciones y semáforo automático de sobrecosto (Normal, Advertencia $\ge 85\%$, Crítico $> 100\%$).
    - Curva S semanal (% Avance Real ponderado vs Presupuesto Cero P0) y mensual devengado vs presupuestado.
    - Exportación a planilla Excel mediante `📥 Exportar Balance (CSV)`.
  - [x] **Pilar 4 — Carga de Documentación Técnica & Versionado:**
    - Selector drag-and-drop de archivos reales (`.dwg`, `.dxf`, `.cad`, `.pdf`, `.docx`, `.xlsx`, imágenes) con lectura Base64 y peso en MB.
    - Botón de descarga directa (`⬇ Descargar`) en cada fila con generación de ficha técnica homologada.
    - Modal de nuevas iteraciones (`+ Iteración`) con reemplazo de archivo, versión incremental (`v1.0` -> `v2.0`) y memoria técnica de cambios.
    - Soporte en backend ampliado hasta 15 archivos y 15 MB con categorización (`plano`, `memoria`, `foto`, `archivo`).
- [x] **Control y Habilitación de Tiers:**
  - [x] Conmutador de plataforma en la barra lateral con diseño grafito industrial, responsive y libre de desbordes.
  - [x] Asignación y cambio de nivel (Classic vs Pro) desde la administración en `/admin/clientes`.
  - [x] Solicitud de habilitación directa a OxI Pro en 1 clic desde modal interactivo con notas de obra, sin confusiones con cotizaciones de herrería.
- [x] **Gestión Integral de Clientes:**
  - [x] Invitaciones por token criptográfico único (`/invitacion/:token`), reenvío y copiado al portapapeles.
  - [x] Eliminación en cascada segura de clientes en PostgreSQL.
  - [x] Importación y exportación de clientes mediante CSV.
  - [x] Cuentas demo y botones de auto-completado rápido en pantallas de login.

#### Fase 7 — OXI Network & Fabricación Distribuida

**Objetivo:** Conectar cotizaciones y proyectos aprobados con la red descentralizada de talleres metalúrgicos y fabricantes homologados.

- [x] **Modelo relacional de órdenes de fabricación (`fabrication_orders`):**
  - Campos: `id`, `quote_id`, `b2b_project_id`, `supplier_id`, `project_name`, `title`, `description`, `target_price`, `currency`, `deadline`, `status`, `progress_percent`, `technical_notes`.
  - Estados soportados: `pending` (asignada) -> `accepted` (aceptada por taller) -> `in_progress` (en fabricación) -> `ready` (lista en taller) -> `delivered` (entregada en obra).
- [x] **Adjudicación desde Administración (`/admin/cotizaciones/:id`):**
  - Modal interactivo para asignar piezas o proyectos a talleres homologados con precio objetivo y plazo de entrega.
  - Trazabilidad y seguimiento del avance físico del taller directamente desde el expediente comercial.
- [x] **Panel Operativo de Taller (`/proveedor`):**
  - Tarjetas de órdenes de fabricación activas con métricas de precio, moneda y fecha límite.
  - Selector de avance físico interactivo (slider de 0 a 100%).
  - Bitácora de notas técnicas de taller para comunicación de ingeniería.
  - Botón de avance de fase (`Aceptar trabajo`, `Comenzar fabricación`, `Marcar pieza lista`, `Confirmar entrega`).
- [x] **Presupuestos Ejecutivos & Conversión Comercial:**
  - Endpoint `POST /admin/costing/pdf` para generar presupuestos formales de 2 páginas en PDF con identidad corporativa Óxida / Mercadobra.
  - Endpoint `POST /admin/costing/convert-to-quote` para convertir cualquier cálculo paramétrico en cotización oficial para el cliente.

### Criterio de salida del MVP

- Una mesa circular puede cotizarse de punta a punta sin editar código ni fórmulas en la base de datos.
- Cambiar un precio crea una nueva versión y afecta solamente cálculos nuevos o borradores actualizados explícitamente.
- El backend reproduce el cálculo esperado y explica cada subtotal.
- Una cotización enviada permanece inmutable y puede auditarse hasta sus variables originales.
- El documento comercial oculta costos internos y coincide con el total autorizado.
- Existen pruebas para valores normales, límites, datos faltantes, fórmulas inválidas y actualización de precios.

## Próximas prioridades de desarrollo

### 🚀 Ejes de Innovación Disruptiva (ConstructionTech)
1. **Configurador 3D Paramétrico Público para Clientes**: Abrir el motor 3D interactivo para familias de herrería estandarizada (Pérgolas, Barandas de vidrio y hierro, Escaleras y Cerramientos) con sliders de medidas, materiales, precio exacto en vivo y botón directo de encargo de fabricación.
2. **Cotizador Instantáneo de Planos por IA (AI Blueprints to BOM)**: Extracción automática con visión multimodal y OCR sobre planos técnicos (PDF / DWG) para generar el cómputo métrico preliminar de acero, metros lineales y horas de taller en < 45 segundos.
3. **Optimizador de Corte (Nesting) y Despiece para Talleres**: Algoritmo de optimización de barras de 6m para reducir desperdicio al < 5% y generación de planillas técnicas de corte en PDF con códigos QR para talleres en OXI Network.
4. **Certificaciones Digitales de Obra con Fotos Georreferenciadas (Mobile-First)**: Interfaz móvil de obra para directores e inspectores con captura de fotos geolocalizadas (GPS + timestamp inmutable) y firma táctil de certificados de avance físico.
5. **Smart Matching Algorítmico y Custodia Segura de Fondos (Escrow)**: Asignación automática de órdenes de trabajo a talleres según especialidad y capacidad ociosa, con retención en garantía de señas y pagos liberados contra hito certificado.

### 🛠️ Estabilidad Operativa y Ecommerce
6. Implementar emails transaccionales de cotizaciones, invitaciones, pedidos y transferencias (Resend / SendGrid).
7. Definir reglas y cálculo dinámico de costos de flete y entrega antes del checkout.
8. Publicar textos legales, términos comerciales y políticas de garantía de obra.
9. Migración física de imágenes históricas Base64 a CDN / Cloudinary.
10. Pruebas E2E de flujos críticos de compra, cotizaciones y webhooks.

## Verificación antes de publicar

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm --prefix backend run db:check`
- [ ] `/health` responde `200`
- [ ] `/products` responde `200`
- [ ] Registro e inicio de sesión de cliente verificados
- [ ] Login administrativo verificado
- [ ] Alta y edición de producto verificadas
- [ ] Pedido y actualización de stock verificados
- [ ] Variables y secretos revisados
- [ ] Backup o procedimiento de recuperación confirmado

## Regla de documentación

Cada cambio funcional debe actualizar este README o [docs/ESTADO_WEB.md](docs/ESTADO_WEB.md) en el mismo commit, sin incluir contraseñas, tokens, URLs de conexión completas ni otros secretos.
