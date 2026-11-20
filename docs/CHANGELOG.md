# Mercadobra / Óxida — Historial de Cambios (Changelog)

Registro histórico de avances completados, auditorías y despliegues en producción.

---

## Noviembre 2026

### 19/11/2026 — S6: Autorización por recurso y prevención de IDOR
- Blindaje de 6 rutas `/customer/b2b-projects/:projectId/oxipro/*` para impedir acceso o modificación de obras de otros comitentes (retorna 404 para mitigar enumeración).
- Filtrado estricto en `GET /orders` para que proveedores únicamente vean pedidos de su catálogo (`providerId`).
- Creación de `backend/src/resourceAuthorization.js` con 7 pruebas unitarias nuevas.
- Commit: `7114f09`.

### 19/11/2026 — S5: Eliminación de texto plano en autenticación
- `verifyPassword` en `authService.js` ahora exige estrictamente formato `scrypt$` y rechaza contraseñas en texto plano.
- Creación de migración SQL `042_enforce_scrypt_passwords.sql` y actualización de contraseñas semilla.
- Commit: `840b9be`.

### 19/11/2026 — S4: Tokens criptográficos en cotizaciones públicas
- Eliminado fallback por ID numérico o referencia `COT-...` en `/public/quotes/:token`.
- Obligatoriedad de tokens seguros de 32+ caracteres generados con `crypto.randomBytes(24)`.
- Rate limiter de 300 req / 15 min y migración SQL `041_quote_tokens_backfill_secure.sql`.
- Commit: `166059d`.

### 19/11/2026 — S3: Límite estricto de payloads JSON
- Límite global reducido a 1 MB por defecto para mitigar ataques de agotamiento de memoria.
- Límite ampliado de 12 MB restringido a rutas de carga de planos e imágenes (`isLargeBodyRoute`).
- Rate limiting de 60 envíos / 15 min en formularios públicos.
- Commit: `652040e`.

### 19/11/2026 — S2: Verificación HMAC en Webhooks de Mercado Pago
- Firma `x-signature` con HMAC-SHA256 y ventana anti-replay de 10 min activa con `MERCADOPAGO_WEBHOOK_SECRET`.
- Validación de monto de seña y moneda contra datos de la cotización.
- Commit: `5661510`.

### 19/11/2026 — S1: Autenticación y rate limiting en OxI Pro
- Protección con `authMiddleware` en `/oxipro/ai-onboarding`, `/oxipro/report/pdf` y `/oxipro/monthly-certificate/pdf`.
- Rate limiting por usuario autenticado (20 IA / 60 PDF por 15 min) y widget de chat limitado a 30 req / 15 min por IP.
- Commit: `e2bdf3a`.

### 19/11/2026 — Identidad visual, PWA y Header móvil
- Header móvil depurado, logo institucional Óxida Studio, footer centrado.
- PWA con manifest oscuro (`manifest.webmanifest`), status bar y service worker v2.

---

## Octubre 2026

### OxI Pro Suite (ConstructionTech de Gestión de Obra)
- **Schedule Gantt & Recursos:** Cálculo de días hábiles reales con feriados oficiales de Uruguay y feriado de la construcción SUNCA. Distribución mensual de costos, control de % Plan vs % Real físico.
- **Leyes Sociales BPS:** Partidas presupuestarias con cálculo automático de aportes al 60% s/mano de obra directa (Ley 14.411).
- **Curva S (EVM):** Reconstrucción con Recharts de curva de valor ganado (PV, EV, AC), índices SPI/CPI y tabla de cronograma valorizado semanal.
- **Informes Ejecutivos:** Generación en 1 clic de informe directivo de obra de 4 páginas en PDF (`POST /oxipro/report/pdf`) y certificado mensual de avance con liquidación de leyes sociales.
- **OxI Copilot:** Asistente contextual con IA para alta de tareas, certificación de avances y reprogramación por lluvias.
- **Persistencia en PostgreSQL:** Modelos relacionales para tareas, rubros, demoras y cotizaciones B2B.

---

## Septiembre 2026

### OXI Quote & Plantillas Paramétricas
- Motor determinístico de cálculo de costos con 81 variables versionadas.
- Plantillas paramétricas para Barandas (OXI Railing R01) y Pérgolas (OXI Pergola P01).
- Extracción asistida con IA de pliegos y solicitudes a parámetros constructivos.
- Conversión directa de cotización técnica a cotización formal de cliente con PDF oficial de 2 páginas.

---

## Agosto 2026

### Base Inicial & Ecommerce
- Plataforma base con catálogo de herrería, carrito persistente y checkout con Mercado Pago.
- Portal administrativo de gestión de productos y pedidos.
- OXI Modela: prototipo de modelador 3D en navegador con Three.js.
