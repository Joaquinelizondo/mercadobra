export const MERCADO_PAGO_ORDER_KEY = 'mercadobra-mercadopago-order'

export function savePendingMercadoPagoOrder(order) {
  try {
    localStorage.setItem(
      MERCADO_PAGO_ORDER_KEY,
      JSON.stringify({
        orderId: order.orderId,
        trackingToken: order.trackingToken,
        buyerPhone: order.buyerPhone,
        createdAt: new Date().toISOString(),
      })
    )
  } catch {
    // El checkout debe continuar aunque el navegador bloquee el almacenamiento local.
  }
}

export function readPendingMercadoPagoOrder() {
  try {
    const raw = localStorage.getItem(MERCADO_PAGO_ORDER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearPendingMercadoPagoOrder() {
  try {
    localStorage.removeItem(MERCADO_PAGO_ORDER_KEY)
  } catch {
    // Sin acción: el estado también se limpia de la URL y de React.
  }
}
