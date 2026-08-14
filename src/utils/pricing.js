export function normalizeDiscount(value) {
  const discount = Number(value) || 0
  return Math.min(99, Math.max(0, discount))
}

export function discountedPrice(price, discountPercent) {
  const originalPrice = Number(price) || 0
  const discount = normalizeDiscount(discountPercent)
  return discount > 0 ? Math.round(originalPrice * (1 - discount / 100) * 100) / 100 : originalPrice
}
