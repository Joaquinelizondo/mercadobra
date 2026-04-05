export function Badge({ children, variant = 'default', size = 'md' }) {
  return (
    <span className={`badge badge--${variant} badge--${size}`}>
      {children}
    </span>
  )
}

export function CategoryBadge({ category }) {
  const categoryColors = {
    'Materiales': 'primary',
    'Herramientas': 'success',
    'Transporte': 'warning',
    'Servicios': 'info',
    'Seguridad': 'danger',
  }
  const variant = categoryColors[category] || 'default'
  return <Badge variant={variant}>{category}</Badge>
}

export function StatusBadge({ status }) {
  return <Badge variant={status}>{status}</Badge>
}
