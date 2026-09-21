import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoImg from '../assets/oxida/logo-clean.png'

export default function CustomerLogin() {
  const {
    customerUser,
    loginCustomer,
    customerAuthError,
    customerAuthLoading,
  } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/cliente'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (customerUser) navigate(redirect, { replace: true })
  }, [customerUser, navigate, redirect])

  useEffect(() => {
    if (customerAuthError) setError(customerAuthError)
  }, [customerAuthError])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const account = await loginCustomer(form.email, form.password)
    if (account) {
      navigate(redirect, { replace: true })
    }
  }

  return (
    <div className="oxi-login-layout">
      <div className="oxi-login-cover">
        <h1>OXI OS</h1>
        <p>Architecture Solutions as a Service. La plataforma operativa para tus obras.</p>
      </div>
      <div className="oxi-login-form-container">
        <div className="login-card" style={{ boxShadow: 'none', border: '1px solid #e5e5e5' }}>
          <Link to="/">
            <img src={logoImg} className="login-logo" alt="Mercadobra" style={{ width: '140px', marginBottom: '1rem' }} />
          </Link>
          <div className="login-card-header">
            <div className="login-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z" fill="currentColor"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.8rem' }}>Iniciar sesión</h1>
            <p>Ingresá con tu cuenta corporativa.</p>
          </div>

          <form className="publish-form" onSubmit={handleSubmit} noValidate>
            {error && <p className="login-error" role="alert">{error}</p>}

          <div className="form-row">
            <label className="form-label" htmlFor="customer-login-email">Correo electrónico</label>
            <input
              id="customer-login-email"
              className="form-input"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tuemail@gmail.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="customer-login-password">Contraseña</label>
            <input
              id="customer-login-password"
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

          <button type="submit" className="cart-confirm-btn" disabled={customerAuthLoading}>
            {customerAuthLoading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <p className="login-signup-hint">
            ¿No tenés cuenta? <Link to="/cliente/registro">Crear cuenta</Link>
          </p>
          <p className="login-signup-hint">
            ¿Sos proveedor? <Link to="/proveedor/login">Ingresá acá</Link>
          </p>
        </form>
      </div>
    </div>
    </div>
  )
}
