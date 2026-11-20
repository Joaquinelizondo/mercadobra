# Mercadobra / Óxida — Hoja de Ruta y Pendientes (Roadmap)

> **Fuente Única de Verdad (Single Source of Truth):** Este documento centraliza todas las prioridades y tareas pendientes del proyecto.
> **Regla de Trabajo:** Se toma **un solo pendiente por vez**, en estricto orden de prioridad. Al terminarlo, se corre la suite completa de pruebas (125 tests), se compila, se marca `[x]`, se anota la fecha y el commit, y recién entonces se avanza al siguiente.

---

## 1. Estado de Referencia del Repositorio (Noviembre 2026)

- **Tests Frontend:** 90 aprobados (`npm test -- --run`).
- **Tests Backend:** 35 aprobados (`cd backend && npm test`).
- **Tests Totales:** 125/125 pasando sin fallas.
- **Compilación de Producción:** Exitosa (`npm run build`).
- **Lint:** 61 errores y 1 warning detectados por sanear en **Q4 / Calidad Base**.

---

## 2. Lista Maestra de Pendientes (Se resuelven de a 1)

### P1 — Seguridad

- [x] **S1.** *(19/11/2026 - Commit `e2bdf3a`)* Endpoints `/oxipro/ai-onboarding`, `/oxipro/report/pdf` y `/oxipro/monthly-certificate/pdf` ahora exigen sesión (`authMiddleware`) y tienen límite por usuario (20 IA / 60 PDF cada 15 min). `POST /chat` limitado a 30 req / 15 min por IP.
- [x] **S2.** *(19/11/2026 - Commit `5661510`)* Validación de firma HMAC-SHA256 (`x-signature`, anti-replay de 10 min) en webhooks de Mercado Pago con `MERCADOPAGO_WEBHOOK_SECRET` y validación de importe/moneda de seña. Con tests dedicados.
- [x] **S3.** *(19/11/2026 - Commit `652040e`)* Límite de body JSON bajado a 1 MB por defecto; 12 MB reservados solo para rutas con archivos o proyectos de obra (`isLargeBodyRoute`). Respuesta 413 clara. Rate limit de 60 envíos / 15 min en formularios públicos. Con tests.
- [x] **S4.** *(19/11/2026 - Commit `166059d`)* Eliminado fallback inseguro de cotizaciones públicas por ID numérico o referencia `COT-...`. Obligatoriedad de tokens criptográficos de 32+ caracteres (`parsePublicQuoteToken`), rate limiter de 300 req / 15 min y migración SQL `041`. Con tests.
- [x] **S5.** *(19/11/2026 - Commit `840b9be`)* Eliminado fallback de contraseñas en texto plano. `verifyPassword` exige hashes `scrypt$` con sal aleatoria. Migración SQL `042` y actualización de seeds. Con tests.
- [x] **S6.** *(19/11/2026 - Commit `7114f09`)* Autorización estricta por recurso (prevención de IDOR): blindaje de las 6 rutas `/customer/b2b-projects/:projectId/oxipro/*` y asignación de cotizaciones. `GET /orders` filtra pedidos por los productos del taller (`providerId`). Con tests unitarios dedicados.
- [ ] **S7. [ACTUAL]** **Log de auditoría:** Registro auditable e inmutable de eventos críticos (quién modificó costos, aprobó presupuestos, emitió certificados o actualizó cronogramas) con usuario, rol, recurso, fecha, IP y snapshot anterior/posterior.
- [ ] **S8.** **Sesión segura en cookies HttpOnly:** Evaluar migración de almacenamiento de tokens de sesión de `localStorage` a cookies `HttpOnly`, `Secure` y `SameSite=Lax` para mitigar riesgos de XSS.

---

### P2 — Arquitectura y Rendimiento

- [ ] **A1.** **Code Splitting con `React.lazy`:** Reducir bundle inicial de 1,56 MB a menos de 300 KB mediante división por rutas (`React.lazy` + `Suspense`): sitio público, portal cliente, administración, proveedores, y carga diferida del visor 3D (966 KB) solo al abrir OXI Modela.
- [ ] **A2.** **Modularización de `OxiProSuite.jsx`:** Dividir el componente monolítico (12.590 líneas) en submódulos por pestaña y dominio (`ProjectHeader`, `ScheduleGantt`, `BudgetRubros`, `EvmDashboard`, `DocumentManager`, `Subcontracts`, `Workforce`, `MonthlyCertificates`).
- [ ] **A3.** **Modularización de `server.js`:** Dividir el servidor (2.605 líneas, 108 rutas) en routers Express modulares por dominio (`/auth`, `/quotes`, `/orders`, `/products`, `/b2b-projects`, `/suppliers`, `/oxipro`, `/admin`).
- [ ] **A4.** **Generación asíncrona de PDFs:** Extraer la generación intensiva de PDFs con PDFKit del hilo principal de Express hacia workers o cola ligera para evitar bloqueos del event loop ante múltiples solicitudes simultáneas.
- [ ] **A5.** **Garantía de persistencia canónica en producción:** Evitar que en producción se utilice silenciosamente el repositorio en memoria si falla la conexión a PostgreSQL; arrojar error crítico en arranque en lugar de fallback silencioso.

---

### P3 — Calidad Base y CI/CD

- [x] **Q1.** *(20/11/2026)* **Saneamiento de ESLint:** 61 errores y 1 warning corregidos (variables no usadas, bloques vacíos, hooks con funciones impuras y `setState` en effects eliminados) logrando 0 errores en `npm run lint`.
- [x] **Q2.** *(20/11/2026)* **Integración Continua (CI con GitHub Actions):** Pipeline `.github/workflows/ci.yml` configurado para ejecutar automáticamente lint, 125 tests y build en cada push y PR.
- [ ] **Q3.** **Limpieza de CSS en `App.css`:** Depurar reglas duplicadas, eliminar uso excesivo de `!important` y corregir sobreescritura accidental de estilos móviles sobre escritorio.

---

### P4 — UI / UX

- [ ] **U1.** **Skeletons y estados vacíos (*Empty States*):** Implementar loaders visuales consistentes y pantallas explicativas cuando no hay presupuestos, tareas o proyectos cargados en los portales.
- [ ] **U2.** **Indicador de modo sin conexión:** Añadir badge visual sutil en el encabezado cuando el service worker detecta pérdida de conexión a internet.
- [ ] **U3.** **Auditoría de Accesibilidad:** Revisar relaciones de contraste WCAG AA, navegación por teclado (`focus-visible`) y atributos `aria-*` en modales y tablas interactivas.
- [ ] **U4.** **Unificación de Iconografía:** Reemplazar emojis residuales en botones e interfaces operativas por iconos vectoriales SVG de Lucide React.

---

### P5 — Negocio y Estrategia

- [ ] **N1.** **Definición de planes y cobro de suscripciones OxI Pro:** Estructurar límites por tier (Classic vs Pro), periodo de prueba (trial de 14 días) y pasarela recurrente.
- [ ] **N2.** **Facturación electrónica DGI:** Evaluar integración de CFE (Comprobantes Fiscales Electrónicos) para cobros en Uruguay.
- [ ] **N3.** **Analítica de embudo y conversión:** Medir con precisión el flujo desde la landing comercial `/partner` y solicitudes de presupuesto hasta la conversión en cliente activo.
- [ ] **N4.** **Priorización estratégica:** Alinear comunicación pública y experiencia de usuario según el peso del ciclo actual: SaaS ConstructionTech (OxI Pro) vs. taller de fabricación digital (Óxida Studio).

---

## 3. Backlog Futuro de Ingeniería (OxI Pro Fase 3)

Funcionalidades de campo y control técnico planificadas para etapas posteriores:
1. **Bitácora Móvil de Obra:** Carga ágil de partes diarios con fotografías de avance y pines geolocalizados/posicionados sobre planos PDF.
2. **Comparador Visual de Versiones de Planos:** Superposición gráfica (*visual diff overlay*) entre versiones de planos arquitectónicos (v1.0 vs v2.0).
3. **Gestión Formal de Órdenes de Cambio (Change Orders) y RFIs Técnicos:** Aprobación formal de adicionales entre comitente y constructora.
4. **Portal del Inversor / Comitente al Paso:** Vista móvil simplificada con fotos, certificados aprobados y estado financiero sin complejidad técnica de obra.
5. **Cómputo Métrico Asistido desde Planos:** Extracción preliminar de medidas y metrajes asistida por IA.
