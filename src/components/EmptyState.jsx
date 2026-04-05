export default function EmptyState({ 
  icon, 
  title = 'Sin resultados', 
  message = 'No hay elementos que mostrar',
  action = null 
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
