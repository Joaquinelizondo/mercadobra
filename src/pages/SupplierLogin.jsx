import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoImg from '../assets/mercadobra.png'

export default function SupplierLogin() {
  const { supplierUser, login, authError, authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/proveedor'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (supplierUser) navigate(redirect, { replace: true })
  }, [supplierUser, navigate, redirect])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const account = await login(form.email, form.password)
    if (!account) {
      setError(authError || 'Usuario o contraseña incorrectos.')
      return
    }
    navigate(redirect, { replace: true })
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Link to="/">
          <img src={logoImg} className="login-logo" alt="MercadObra" />
        </Link>

        <div className="login-card-header">
          <div className="login-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z" fill="currentColor"/>
            </svg>
          </div>
          <h1>Acceso proveedores</h1>
          <p>Ingresá con las credenciales de tu empresa para gestionar tu catálogo.</p>
        </div>

        <form className="publish-form" onSubmit={handleSubmit} noValidate>
          {error && <p className="login-error" role="alert">{error}</p>}

          <div className="form-row">
            <label className="form-label" htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              className="form-input"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="empresa@mercadobra.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              className="form-input"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="cart-confirm-btn" disabled={authLoading}>
            {authLoading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>

          <p className="login-signup-hint">
            ¿Tu empresa todavía no tiene cuenta?{' '}
            <a href="/#contacto">Contactanos</a> para sumarte.
          </p>
        </form>

        <div className="login-demo-hint">
          <p>
            <strong>Cuenta seed:</strong> proveedor@mercadobra.com con contraseña 123456
          </p>
        </div>
      </div>
    </div>
  )
}
