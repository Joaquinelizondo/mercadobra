import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
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
              {process.env.NODE_ENV === 'development' && (
                <details className="error-details">
                  <summary>Detalles del error (desarrollo)</summary>
                  <pre>{this.state.error?.toString()}</pre>
                </details>
              )}
              <button 
                className="btn-primary" 
                onClick={() => window.location.reload()}
              >
                Actualizar página
              </button>
            </div>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}
