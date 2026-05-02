# MercadObra

Frontend en React + Vite y backend MVP en Express.

## Frontend

```bash
npm install
npm run dev
```

Variables (frontend):

- Copiar `.env.example` a `.env`
- `VITE_API_BASE_URL` (default recomendado: `http://localhost:4000`)

## Backend (MVP)

El backend está en `backend/` con persistencia simple en JSON para arrancar rápido.

```bash
# ejecutar desde la carpeta mercadobra/mercadobra
npm --prefix backend install
npm run dev:backend
```

Variables de entorno:

- Copiar `backend/.env.example` a `backend/.env`
- `PORT` (default `4000`)
- `FRONTEND_ORIGIN` (uno o varios orígenes separados por coma, ej. `http://localhost:5173,http://localhost:4173`)
- `DATABASE_URL` para usar PostgreSQL en lugar del store JSON local
- `OPENAI_API_KEY` para activar respuestas IA con proveedor externo
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `OPENAI_BASE_URL` (default `https://api.openai.com/v1`)
- `FRONTEND_PUBLIC_URL` para construir links de seguimiento en notificaciones
- `WHATSAPP_WEBHOOK_URL` opcional para enviar cambios de estado (si no está, se loguea en consola)
- `MERCADOPAGO_ACCESS_TOKEN` para habilitar checkout con Mercado Pago
- `BACKEND_PUBLIC_URL` URL pública del backend para webhooks (ej. `https://api.tudominio.com`)

Si no configurás `OPENAI_API_KEY`, el chat funciona igual con un modo local basado en catálogo.

### PostgreSQL opcional

Si configurás `DATABASE_URL`, el backend usa PostgreSQL automáticamente.

```bash
npm --prefix backend run migrate
```

Mientras no exista `DATABASE_URL`, sigue funcionando con JSON local para desarrollo rápido.

## Endpoints principales

- `GET /health`
- `POST /auth/login`
- `GET /providers`
- `GET /providers/:id/products`
- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PATCH /products/:id`
- `DELETE /products/:id`
- `POST /orders`
- `POST /payments/mercadopago/checkout`
- `POST /payments/mercadopago/webhook`
- `GET /orders`
- `GET /orders/track/:trackingToken?phone=...`
- `PATCH /orders/:id/status`
- `GET /orders/:id/notifications`
- `POST /leads`
- `POST /chat`

Al cambiar estado de una orden, el backend dispara una notificación al cliente:

- Si hay `WHATSAPP_WEBHOOK_URL`, envía un POST al webhook configurado.
- Si no hay webhook, usa modo mock y registra el mensaje en consola.
- Además guarda un log persistente del intento (canal, éxito/error, motivo y fecha).

## Scripts útiles

- `npm run dev` → frontend
- `npm run dev:backend` → backend
- `npm run dev:all` → frontend + backend
- `npm run start:backend` → backend sin nodemon
- `npm run db:bootstrap` → migraciones + seed en Postgres
- `npm run db:check` → valida conexión y tablas mínimas
- `npm run preflight` → chequeo previo rápido de DB

## Cierre Etapa 1 (Go/No-Go)

Checklist tildable para congelar alcance y cerrar MVP:

- [x] Home clara: se entiende que se puede comprar o consultar proveedor
- [x] Flujo comprador: buscar → ver producto → carrito → checkout → tracking
- [x] Flujo proveedor: login → ver pedidos → cambiar estado
- [x] Casos borde mínimos: sin stock, tracking no encontrado, validaciones de formularios
- [x] Calidad visual base: desktop/mobile funcional y textos legibles
- [x] Infra local: `npm run build` (frontend) y `npm --prefix backend run db:check` OK
- [ ] URL pública estable (frontend + backend) lista para compartir
- [ ] Variables y secretos revisados en entorno de producción

### Estado actual

Etapa 1 está funcional y consistente en local. Para cerrar oficialmente, falta completar despliegue público y revisión final de secretos/env para producción.
