# Mercadobra / Óxida — Operación, Despliegue y Desarrollo Local

Este documento detalla la infraestructura, variables de entorno, procesos de despliegue, migraciones y comandos operativos.

---

## 1. Infraestructura de Producción

| Componente | Plataforma | URL / Host | Notas |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | `https://mercadobra.com` | Build Vite, SPA + PWA. Redirecciones en `vercel.json`. |
| **Backend API** | Render | `https://mercadobra.onrender.com` | Web Service Node.js (Linux). Auto-deploy desde rama `main`. |
| **Base de Datos** | Render | PostgreSQL Gestionado | Conexión SSL (`DATABASE_URL`). Migraciones automáticas al iniciar. |
| **Almacenamiento** | Cloudinary | CDN Cloudinary | Almacenamiento seguro de imágenes y planos. |
| **Pagos** | Mercado Pago | API Producción | Checkout Pro, Webhooks con firma HMAC. |

---

## 2. Variables de Entorno

### Backend (`mercadobra/backend/.env`)

```env
# Servidor & Red
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://mercadobra.com
BACKEND_PUBLIC_URL=https://mercadobra.onrender.com

# Base de Datos PostgreSQL
DATABASE_URL=postgres://usuario:password@host:5432/dbname?sslmode=require

# OpenAI (Asistente OxI Copilot, Ingesta de Obras, Extracción de Cotizaciones)
OPENAI_API_KEY=sk-...

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=... # Clave secreta para verificar HMAC-SHA256 (x-signature)

# Cloudinary (Imágenes y Documentos)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Notificaciones y Correo (Opcional)
RESEND_API_KEY=re_...
ADMIN_EMAIL=contacto@oxida.com.uy
```

### Frontend (`mercadobra/.env`)

```env
VITE_API_URL=https://mercadobra.onrender.com
```

---

## 3. Desarrollo Local

### Requisitos
- Node.js 20+ y npm 10+.
- (Opcional) Instancia local de PostgreSQL; si no se provee `DATABASE_URL`, el backend arranca automáticamente con almacenamiento local en `backend/data/db.json`.

### Puesta en Marcha

1. **Instalar dependencias:**
   ```bash
   cd mercadobra
   npm install
   cd backend
   npm install
   ```

2. **Configurar variables:**
   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Iniciar servicios en paralelo:**
   - En una terminal (Backend):
     ```bash
     cd backend
     npm run dev
     ```
     *El backend escuchará en `http://localhost:3001`.*
   - En otra terminal (Frontend):
     ```bash
     npm run dev
     ```
     *El frontend abrirá en `http://localhost:5173`.*

---

## 4. Scripts de Verificación y Calidad

Desde la raíz del repositorio (`mercadobra/`):

| Comando | Acción | Criterio de éxito |
| :--- | :--- | :--- |
| `npm test -- --run` | Ejecuta los 90 tests unitarios del frontend. | `pass 90, fail 0` |
| `cd backend && npm test` | Ejecuta los 35 tests unitarios del backend. | `pass 35, fail 0` |
| `npm run build` | Compila el frontend para producción con Vite. | `✓ built in ...` |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. | 0 errores (en proceso de saneamiento). |

---

## 5. Migraciones de Base de Datos

Las migraciones de PostgreSQL residen en `backend/migrations/*.sql` y se ejecutan secuencialmente de forma idempotente al iniciar el backend mediante `backend/src/migrate.js`.

- Cada archivo tiene el prefijo `001_...`, `002_...`, ..., `042_...`.
- El sistema mantiene una tabla `migrations_lock` y `schema_migrations` para garantizar que cada migración corra una sola vez.
- Para agregar una nueva migración:
  1. Crear `backend/migrations/0XX_nombre_descriptivo.sql`.
  2. Usar cláusulas `IF NOT EXISTS` o verificaciones de columnas para asegurar idempotencia.
  3. Probar tanto en base vacía como sobre base existente.

---

## 6. Monitoreo y Diagnóstico

- **Healthcheck:** `GET /health` responde `{"status":"ok","timestamp":"..."}`.
- **Logs de Producción:** Disponibles en la consola de Render Dashboard.
- **Backups de Base de Datos:** Gestionados automáticamente en Render Postgres con retención periódica.
