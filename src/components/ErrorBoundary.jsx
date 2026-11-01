import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="section error-boundary-section">
          <div className="error-boundary-container">
            <div className="error-boundary-content">
              <h1 className="error-boundary-title">Algo salió mal</h1>
              <p className="error-boundary-message">
                Lo sentimos, ocurrió un error inesperado. Por favor, intenta actualizar la página.
              </p>
              <details className="error-details">
                <summary>Ver detalles técnicos del error</summary>
                <pre>
                  {this.state.error?.toString()}
                  {this.state.error?.stack ? `\n\n${this.state.error.stack}` : ''}
                  {this.state.errorInfo?.componentStack ? `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}` : ''}
                </pre>
              </details>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => window.location.reload()}
                >
                  Actualizar página
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => { window.location.href = '/' }}
                >
                  Ir al inicio
                </button>
              </div>
            </div>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}
