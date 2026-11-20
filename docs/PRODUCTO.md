# Mercadobra / Óxida — Documento de Producto

Este documento describe la visión, módulos, roles y experiencia comercial de la plataforma.

---

## 1. Visión y Propuesta de Valor

Mercadobra / Óxida integra dos propuestas complementarias:
1. **Óxida Studio:** Fabricación y diseño de herrería arquitectónica, pergolados, barandas, escaleras y equipamiento a medida en Uruguay, con canal comercial digital y cotizaciones paramétricas.
2. **Plataforma OxI & OxI Pro Suite:** Plataforma ConstructionTech B2B para estudios de arquitectura, constructoras y desarrolladores. Permite gestionar presupuestos técnicos, cómputos métricos, cronogramas Gantt, leyes sociales SUNCA/BPS (Ley 14.411 al 60%), control de costos en tiempo real (EVM / Curva S) y subcontratos.

---

## 2. Experiencia Pública e Identidad Comercial

- **Sitio Público (`/`):** Presentación institucional de Óxida Studio, portfolio de proyectos de arquitectura, catálogo y solicitud de presupuestos a medida.
- **Acceso B2B / Partner (`/partner`):** Landing dirigida a constructoras y profesionales para dar a conocer las herramientas de OxI Pro Suite.
- **Cotizador Público & Rastreo de Cotizaciones (`/cotizaciones`):** Consulta interactiva del estado de presupuestos mediante token criptográfico seguro de 32+ caracteres.

---

## 3. Roles de Usuario y Portales

### A. Clientes / Comitentes (`/cliente`, `/login`)
- **OxI Clásico:** Espacio documental para ver presupuestos formales (v1.0, v2.0, etc.), planos CAD/PDF, cómputos métricos, pliegos técnicos, mensajería directa con ingeniería y aprobación o rechazo con 1 clic.
- **OxI Pro Suite:** Módulo avanzado de gestión de obra habilitable por nivel (`classic` / `pro`) para comitentes y jefes de obra.
- **Pagos de Seña:** Aprobación de presupuestos e integración con Mercado Pago o carga de comprobante de transferencia bancaria.

### B. Proveedores / Talleres Asociados (`/proveedor`, `/proveedor/login`)
- **OXI Network:** Red de fabricación distribuida donde talleres homologados reciben órdenes de taller con precio objetivo, fecha límite y planos adjuntos.
- **Tablero Operativo:** Control de estados de fabricación (`pending` -> `accepted` -> `in_progress` -> `ready` -> `delivered`), slider de avance físico (0–100%) y notas técnicas de taller.

### C. Administradores (`/admin`, `/admin/login`)
- **Gestión de Clientes (`/admin/clientes`):** Altas, perfiles de comitentes, asignación de tiers (Classic / Pro), invitaciones criptográficas y exportación masiva.
- **Gestión de Cotizaciones (`/admin/cotizaciones`):** Bandeja técnica, revisión de desgloses de costos, asignación a talleres y generación de PDFs ejecutivos.
- **Constructor Paramétrico OXI Quote (`/admin/cotiza`, `/admin/plantillas`):** Motor de costeo determinístico con más de 81 variables versionadas, recetas paramétricas y fórmulas matemáticas.
- **OXI Modela 3D (`/admin/modela`):** Modelador 2D/3D paramétrico para diseño arquitectónico preliminar con estimación de costos en vivo.
- **Analítica Ejecutiva (`/admin/analytics`):** Métricas de GMV, embudo comercial, conversión de presupuestos y estados de producción.

---

## 4. OxI Pro Suite — Módulos de Control de Obra

1. **Gestor de Obras y Proyectos:**
   - Multi-obra con conmutador en cabecera y persistencia reactiva en PostgreSQL (`b2b_projects`).
2. **Cronograma Gantt & Recursos:**
   - Cálculo de días hábiles reales (descontando feriados oficiales de Uruguay y feriado del trabajador de la construcción SUNCA).
   - Distribución mensual de costos, control de % Planificado vs. % Real físico.
   - Asignación de cuadrillas SUNCA (oficial, medio oficial, peón) y leyes sociales al 60%.
   - Desplazamiento por lluvias (individual o en bloque) con empuje automático de dependencias en cascada y actas de lluvia.
3. **Control de Presupuestos & Rubros:**
   - Partidas con desglose tripartito (Mano de Obra directa, Leyes Sociales BPS al 60%, Materiales / Subcontratos).
   - Alertas de desvío presupuestario ($\ge 85\%$ advertencia, $> 100\%$ crítico).
   - Ingestión inteligente de planillas de cálculo (Excel / TSV / CSV).
4. **Control Físico-Financiero & Curva S (EVM):**
   - Curva de Valor Ganado (PV vs. EV vs. AC) construida en Recharts.
   - Índices de rendimiento de cronograma (SPI) y de costo (CPI).
   - Cronograma valorizado semanal y estado a fecha de corte.
5. **Gestor Documental Técnico:**
   - Carga clasificada de planos (.dwg, .dxf, .pdf), especificaciones e iteraciones con control de versiones.
6. **Subcontratos y Fondo de Reparo:**
   - Seguimiento de contratos con subcontratistas, adicionales aprobados, certificados acumulados y retención de garantía (5% estándar).
7. **Informes Ejecutivos & Certificados en PDF:**
   - Informe ejecutivo de obra de 4 páginas (`POST /oxipro/report/pdf`).
   - Certificado mensual de avance y liquidación de leyes sociales (`POST /oxipro/monthly-certificate/pdf`).
8. **OxI Copilot (Asistente de Obra con IA):**
   - Panel conversacional interactivo para crear tareas, certificar avances, registrar lluvias o analizar desvíos mediante lenguaje natural con confirmación visual antes de aplicar.

---

## 5. OXI Modela (Simulador 3D)

Herramienta interna en fase beta privada para modelado arquitectónico ligero en navegador:
- Motor 2D/3D sobre Three.js y React Three Fiber.
- Dibujo ortogonal de muros con ajuste a rejilla (10 cm).
- Inserción paramétrica de puertas, ventanas y aberturas con cálculo de antepecho y dintel.
- Detección automática de ambientes cerrados y colocación de pisos y cielorrasos.
- Estimación preliminar de metros lineales de muro, metros cuadrados de cubierta y costo aproximado.
