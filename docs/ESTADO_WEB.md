# Estado General de Mercadobra / Óxida

> **Aviso de Documentación:** La lista priorizada y activa de pendientes se mantiene en **[docs/ROADMAP.md](ROADMAP.md)** como única fuente de verdad. Este documento se conserva como índice de estado general del sistema.

**Producción:** <https://mercadobra.com>  
**Backend:** <https://mercadobra.onrender.com>  
**Última actualización:** 20 de noviembre de 2026

---

## Estado Técnico Resumido

| Área | Estado | Observación |
| :--- | :--- | :--- |
| **Pruebas Automatizadas** | ✅ Excelente (125 tests) | 90 tests frontend y 35 tests backend pasando en verde (`npm test`). |
| **Compilación de Producción** | ✅ Operativa | Build de Vite y empaquetado de backend funcionando sin errores. |
| **Calidad de Código / Lint** | ✅ Limpio (0 errores) | ESLint en verde total (0 errores, 0 warnings). CI activo en GitHub Actions. |
| **Seguridad de API** | 🔒 Blindada | Contraseñas `scrypt`, rate limiters, validación HMAC en MP, prevención de IDOR activa (S1-S6 listos). Próximo: log de auditoría (S7). |
| **Base de Datos** | ✅ Operativa | PostgreSQL en Render con migraciones idempotentes (001 a 042) y fallback local seguro en JSON. |
| **Plataforma OxI Pro** | ✅ Operativa | Gantt interactivo, leyes sociales BPS (60%), Curva S (EVM), exportación a PDF y Copilot con IA. |
| **PWA / Móvil** | ✅ Operativa | Manifiesto oscuro, iconos maskables y service worker con caché offline. |

---

## Índice de Documentación del Proyecto

- **[docs/ROADMAP.md](ROADMAP.md):** Lista maestra de pendientes (Seguridad, Arquitectura, Calidad, UI/UX, Negocio).
- **[docs/PRODUCTO.md](PRODUCTO.md):** Visión funcional, portales, roles y módulos de OxI Pro Suite.
- **[docs/ARQUITECTURA.md](ARQUITECTURA.md):** Diagrama de arquitectura, stack técnico, modelos de datos y seguridad.
- **[docs/OPERACION.md](OPERACION.md):** Despliegue en Vercel/Render, variables de entorno, migraciones y desarrollo local.
- **[docs/CHANGELOG.md](CHANGELOG.md):** Historial condensado de cambios y versiones completadas.
