# Estado y plan de mejoras de MercadoBra

Documento vivo para registrar el estado de la web, ordenar los pendientes y actualizar el avance en cada implementación.

**Última revisión:** 1 de agosto de 2026  
**Producción:** <https://mercadobra.com>  
**Regla:** cada cambio funcional debe actualizar este documento en el mismo commit.

## Convención de estados

- **Pendiente:** todavía no se inició.
- **En curso:** existe trabajo activo, pero no está listo para producción.
- **Bloqueado:** requiere una decisión, credencial o intervención externa.
- **Terminado:** implementado, verificado y disponible en producción.

## Estado general

| Área | Estado | Evaluación |
| --- | --- | --- |
| Diseño e identidad | Bueno | La propuesta MercadoBra + Oxida tiene una identidad clara. |
| Catálogo | Funcional, incompleto | Productos, stock, variantes y estados están conectados. |
| Cotizador | Funcional | Busca productos y captura datos del cliente. |
| Carrito | Funcional | Cantidades limitadas por stock y checkout completo. |
| Mercado Pago | Activo | Está configurado en modo real. |
| Administración | Funcional | Permite crear, editar, publicar y borrar productos. |
| Pedidos | Funcional | Guarda órdenes, descuenta stock y permite seguimiento. |
| Seguridad | Mejorada | Contraseñas cifradas y sesiones revocables; queda como mejora futura migrar la sesión del navegador a cookies HttpOnly. |
| SEO | Muy básico | Falta metadata, títulos por página, sitemap y contenido indexable. |
| Pruebas | Insuficiente | Compila y pasa lint, pero no hay pruebas automatizadas. |
| Producción | Operativa | Frontend y backend responden, pero falta terminar la integración bajo un único dominio. |

## Prioridades

### P0 — Riesgos antes de aceptar compras reales

| Punto | Estado | Criterio para darlo por terminado |
| --- | --- | --- |
| Evitar cobros de productos con precio simbólico | Pendiente | Ningún producto con precio de prueba puede iniciar un pago real; se cargan precios definitivos o se muestra “Consultar precio”. |
| Reemplazar autenticación temporal | Terminado | Contraseñas cifradas, sesiones aleatorias con vencimiento y cierre de sesión revocable, verificadas en producción. |
| Crear entorno de pruebas de compra | Pendiente | Backend, base de datos y Mercado Pago sandbox separados de producción. |
| Probar compra completa | Pendiente | Pago aprobado, pendiente, rechazado y abandonado verificados; stock y notificaciones consistentes. |

### P1 — Experiencia de compra

| Punto | Estado | Criterio para darlo por terminado |
| --- | --- | --- |
| Fotografías reales por producto | Pendiente | Cada producto publicado tiene portada, galería, texto alternativo y almacenamiento externo. |
| Ficha de producto completa | Terminado | Galería, medidas, variantes, stock, plazo, entrega, proveedor y acción de compra/cotización implementados. |
| Stock por variante/SKU | Pendiente | El carrito, backend, pedido y administración trabajan con la variante seleccionada y su stock real. |
| Persistencia del carrito | Pendiente | El carrito sobrevive recargas y vuelve a validar stock y precio antes del checkout. |
| Resumen final y entrega | Pendiente | El comprador ve productos, variante, envío, plazo, moneda y total antes de pagar. |
| Snapshot de precios en órdenes | Pendiente | Cada orden conserva nombre, SKU, precio, moneda, cantidad y subtotal históricos. |

### P2 — Operación administrativa

| Punto | Estado | Criterio para darlo por terminado |
| --- | --- | --- |
| Gestión administrativa de pedidos | Pendiente | Lista, filtros, detalle, estados y datos de pago disponibles para administración. |
| Alertas de stock | Pendiente | Productos sin stock o con stock bajo son visibles y notificables. |
| Archivo seguro de productos | Pendiente | Productos con historial se archivan y no se eliminan físicamente. |
| Exportación e historial | Pendiente | Pedidos/consultas exportables y cambios administrativos auditables. |
| Gestión de proveedores y categorías | Pendiente | Altas, edición, estados y relaciones administrables. |

### P3 — Lanzamiento y crecimiento

| Punto | Estado | Criterio para darlo por terminado |
| --- | --- | --- |
| Backend bajo el dominio principal | Pendiente | `https://mercadobra.com/api/health` y todos los endpoints funcionan mediante proxy. |
| SEO técnico | Pendiente | Idioma, metadata por ruta, canonical, Open Graph, sitemap, robots y datos estructurados. |
| Analytics y embudo | Pendiente | Se miden búsqueda, contacto, carrito, checkout, pago y abandono sin registrar datos sensibles. |
| Textos legales | Pendiente | Privacidad, términos, entrega, cambios y condiciones de productos personalizados publicados. |
| Monitoreo y respaldos | Pendiente | Alertas de errores, healthchecks, backups verificados y procedimiento de recuperación. |
| Pruebas automatizadas | Pendiente | Casos críticos de autenticación, stock, carrito, órdenes, pagos y cotizador cubiertos. |

## Decisiones pendientes

1. Definir cuáles productos tendrán precio y compra directa.
2. Definir cuáles productos serán exclusivamente “Consultar precio”.
3. Confirmar precios y moneda definitivos del catálogo.
4. Elegir almacenamiento de imágenes: Cloudinary, S3, Supabase Storage u otro.
5. Definir costo y reglas de entrega por zona.
6. Definir datos fiscales, vendedor responsable y condiciones comerciales.

## Registro de avances

| Fecha | Cambio | Estado/resultados | Commit |
| --- | --- | --- | --- |
| 2026-08-01 | Creación del documento de estado y plan de mejoras. | Se documentó la línea base y se ordenaron pendientes P0–P3. | Documentación inicial |
| 2026-08-01 | Seguridad de autenticación. | Contraseñas con scrypt, migración automática de credenciales antiguas, sesiones aleatorias de siete días y revocación al cerrar sesión. Despliegue confirmado; los tokens antiguos son rechazados. | 60990bc |
| 2026-08-01 | Ficha profesional de producto. | Se agregó galería, variantes, disponibilidad, información comercial, compra/cotización, especificaciones y productos relacionados. | Este cambio |

## Forma de trabajo

Para cada punto pendiente:

1. Cambiar su estado a **En curso** al comenzar.
2. Implementar el cambio y verificarlo en proporción al riesgo.
3. Cambiarlo a **Terminado** únicamente cuando cumpla el criterio indicado.
4. Agregar una fila al registro de avances con fecha, resultado y commit.
5. Si requiere una credencial o decisión externa, marcarlo como **Bloqueado** y documentar exactamente qué falta.
