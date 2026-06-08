export function formatPrice(n, currency = 'UYU') {
  const amount = Number(n)
  const safeAmount = Number.isFinite(amount) ? amount : 0

  const normalizedCurrency = String(currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU'

  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: 0,
  }).format(safeAmount)
}

export function companyInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
