# Mercadobra / Óxida Studio

Plataforma uruguaya que integra **Óxida Studio** (fabricación y diseño de herrería arquitectónica a medida) con **OxI Pro Suite** (plataforma ConstructionTech B2B para estudios de arquitectura y constructoras: cronograma Gantt, leyes sociales SUNCA/BPS Ley 14.411 al 60%, control de costos en tiempo real EVM/Curva S y gestión de presupuestos).

- **Producción (Frontend):** <https://mercadobra.com>
- **Backend API:** <https://mercadobra.onrender.com>
- **Última actualización:** 20 de noviembre de 2026

---

## Índice de Documentación

Para mantener el repositorio ordenado y evitar información contradictoria, la documentación se organiza en módulos específicos:

| Documento | Descripción |
| :--- | :--- |
| **[docs/ROADMAP.md](docs/ROADMAP.md)** | **Única fuente de verdad de pendientes y prioridades** (Seguridad S1–S8, Arquitectura A1–A5, Calidad Q1–Q3, UI/UX, Negocio). |
| **[docs/PRODUCTO.md](docs/PRODUCTO.md)** | Visión comercial, roles de usuario (Clientes, Proveedores, Admin) y módulos funcionales (OxI Pro, OXI Modela 3D, OXI Quote). |
| **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** | Diagrama del sistema, stack tecnológico, modelos relacionales en PostgreSQL y políticas de seguridad (RBAC/ABAC, rate limiting). |
| **[docs/OPERACION.md](docs/OPERACION.md)** | Guía de despliegue en producción (Render, Vercel), variables de entorno, migraciones SQL y puesta en marcha local. |
| **[docs/CHANGELOG.md](docs/CHANGELOG.md)** | Historial cronológico de cambios, auditorías y versiones completadas. |

---

## Estado Técnico Actual

- **Pruebas Automatizadas:** 125 tests pasando sin errores.
  - Frontend: 90 tests unitarios (`npm test -- --run`).
  - Backend: 35 tests unitarios (`cd backend && npm test`).
- **Compilación de Producción:** Exitosa (`npm run build`).
- **Seguridad:** Autenticación reforzada con `scrypt`, prevención de IDOR en proyectos y pedidos, validación de firmas HMAC en webhooks de Mercado Pago, rate limiters por IP/usuario y límites estrictos de payload JSON.
- **Base de Datos:** PostgreSQL en Render con 42 migraciones idempotentes versionadas y fallback seguro para desarrollo local.

---

## Prioridad Activa de Trabajo

> **Regla de oro:** Se toma **un solo pendiente por vez** de la lista maestra en **[docs/ROADMAP.md](docs/ROADMAP.md)**. Al completarlo se verifica con la suite de 125 tests, se compila, se actualiza el estado y recién entonces se avanza al siguiente.

### Próximo Ítem en Curso:
> **S7.** **Log de auditoría:** Registro auditable e inmutable de eventos críticos (quién modificó costos, aprobó presupuestos, emitió certificados o actualizó cronogramas) con usuario, rol, recurso, fecha, IP y snapshot de cambios.

### Ítems de Seguridad Resueltos Recientemente:
- [x] **S1.** Autenticación y rate limiting en endpoints de IA y generación de reportes PDF de OxI Pro.
- [x] **S2.** Verificación de firma HMAC-SHA256 (`x-signature`) y anti-replay en webhooks de Mercado Pago.
- [x] **S3.** Reducción de límite de body JSON a 1 MB global (12 MB reservado exclusivamente a cargas con archivos).
- [x] **S4.** Eliminación de acceso predecible a cotizaciones por ID numérico; migración a tokens criptográficos de 32+ caracteres.
- [x] **S5.** Eliminación de contraseñas en texto plano; obligatoriedad de hashes `scrypt` con sal aleatoria.
- [x] **S6.** Autorización estricta por recurso (prevención de IDOR) en proyectos de obra B2B y pedidos de proveedores.

---

## Puesta en Marcha Rápida (Desarrollo Local)

### 1. Clonar e Instalar Dependencias
```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

### 2. Configurar Variables de Entorno
```bash
cp backend/.env.example backend/.env
```
*(Si no se define `DATABASE_URL`, el sistema iniciará en modo desarrollo utilizando almacenamiento local en `backend/data/db.json`).*

### 3. Iniciar Entorno de Desarrollo
```bash
# Terminal 1 - Backend (http://localhost:3001)
cd backend && npm run dev

# Terminal 2 - Frontend (http://localhost:5173)
npm run dev
```

---

## Comandos de Verificación y Calidad

Antes de realizar commits o abrir Pull Requests, correr las siguientes comprobaciones:

```bash
# 1. Correr tests de frontend (90 tests)
npm test -- --run

# 2. Correr tests de backend (35 tests)
cd backend && npm test && cd ..

# 3. Validar build de producción
npm run build
```

---

## Licencia y Derechos

© 2026 Óxida Studio / Mercadobra. Todos los derechos reservados.
