# MercadoBra

Plataforma uruguaya para descubrir, cotizar y comprar productos para obra, con experiencias separadas para clientes, proveedores y administradores.

**Producción:** <https://mercadobra.com>

**Backend:** <https://mercadobra.onrender.com>

**Última actualización:** 8 de agosto de 2026

El estado funcional detallado y las prioridades se mantienen también en [docs/ESTADO_WEB.md](docs/ESTADO_WEB.md).

## Estado actual

La plataforma se encuentra operativa con:

- Frontend React + Vite desplegado en Vercel.
- Backend Express desplegado como Web Service en Render.
- PostgreSQL en Render como almacenamiento de producción.
- Catálogo, fichas de producto, carrito, checkout y seguimiento de pedidos.
- Registro e inicio de sesión de clientes.
- Acceso y panel para proveedores.
- Administración de productos, pedidos, cotizaciones y personalizaciones.
- Autenticación con contraseñas cifradas y sesiones revocables.
- Integración de Mercado Pago y servicios opcionales de notificaciones.

En agosto de 2026 se reemplazó una instancia PostgreSQL que quedó atrapada en un ciclo de reinicio. La base activa nueva recibió correctamente las migraciones, verificó todas las tablas y recreó la cuenta administrativa mediante `admin:bootstrap`. La instancia anterior debe conservarse suspendida mientras exista interés en recuperar información histórica.

## Accesos de la plataforma

| Perfil | Ruta | Uso |
| --- | --- | --- |
| Cliente | `/cliente/login` | Cuenta, datos personales y seguimiento de pedidos. |
| Registro de cliente | `/cliente/registro` | Alta de nuevos clientes. |
| Proveedor | `/proveedor/login` | Acceso profesional y gestión operativa. |
| Administrador | `/admin/login` | Productos, pedidos, consultas y personalizaciones. |

El pie de página incluye un acceso administrativo discreto y minimalista con un pequeño candado. La seguridad del panel no depende de ocultar la URL, sino de la autenticación y autorización del backend.

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

## Dirección de producto y estilo de plataforma

MercadoBra debe evolucionar como una plataforma modular, no como una suma de pantallas aisladas. Cada módulo administrativo comparte navegación, jerarquía visual, estados, filtros, formularios y patrones de confirmación.

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

- Encabezado “Clientes” con cantidad total y acción secundaria de exportación futura.
- Métricas compactas: total, activos, nuevos del mes y clientes con pedidos.
- Búsqueda por nombre, email, teléfono o documento.
- Filtros por estado, fecha de alta, localidad y actividad comercial.
- Tabla en escritorio y tarjetas compactas en móvil.
- Paginación preparada para trabajar con grandes volúmenes.

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

**Ubicación propuesta:** dentro del detalle de `/admin/clientes/:id`, en una pestaña **Cotizaciones y trabajos**.

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

La primera imagen funciona como portada. Actualmente las imágenes se convierten a Data URL y se guardan en la columna JSONB `images`. Para escalar, se recomienda subir los archivos a Cloudinary, S3, Supabase Storage o un servicio equivalente y guardar únicamente sus URLs.

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

El catálogo inicial de Oxida se carga mediante la migración `013_oxida_catalog.sql`. La cuenta administrativa se inserta o actualiza mediante `backend/src/bootstrapAdmin.js`.

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
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- Credenciales SMTP o Resend.
- Variables de Meta WhatsApp, Twilio o webhook de WhatsApp.

Si OpenAI o WhatsApp no están configurados, el backend muestra advertencias informativas, pero puede iniciar normalmente.

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
npm run migrate && npm run db:check && npm run admin:bootstrap && node src/server.js
```

En un servicio que permita Pre-Deploy Command:

```text
Build Command:
npm ci

Pre-Deploy Command:
npm run migrate && npm run db:check && npm run admin:bootstrap

Start Command:
node src/server.js
```

Señales de un inicio correcto:

```text
DB OK. Tablas verificadas: ...
Usuario administrador verificado.
MercadObra backend listening on http://localhost:10000
```

Endpoints de diagnóstico:

- `GET https://mercadobra.onrender.com/health`
- `GET https://mercadobra.onrender.com/products`

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
- Producción conectada a una nueva instancia PostgreSQL y esquema versionado.
- Primera versión administrativa de clientes con perfiles editables y estados de cuenta.
- CORS habilitado para dominio principal, variante `www` y Vercel.

## Próximas prioridades

1. Mostrar correctamente los errores `429` y tiempos de espera en los formularios de login.
2. Implementar cotizaciones, proyectos y entregas de pago dentro del perfil de cada cliente.
3. Completar auditoría, paginación y restablecimiento seguro del módulo administrativo de clientes.
4. Definir e integrar almacenamiento externo para adjuntos de cotizaciones y fotografías de productos.
5. Incorporar características técnicas flexibles por producto.
6. Configurar backups y un plan PostgreSQL apto para producción.
7. Eliminar el falso éxito del modo offline en operaciones administrativas.
8. Agregar pruebas automatizadas para autenticación, clientes, cotizaciones, stock, pedidos y pagos.
9. Completar SEO, analytics, textos legales y monitoreo.
10. Separar sandbox y producción para Mercado Pago y confirmar condiciones comerciales definitivas.

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
