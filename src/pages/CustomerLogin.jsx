import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoImg from '../assets/mercadobra.png'

export default function CustomerLogin() {
  const {
    customerUser,
    loginCustomer,
    customerAuthError,
    customerAuthLoading,
  } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (customerUser) navigate(redirect, { replace: true })
  }, [customerUser, navigate, redirect])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const account = await loginCustomer(form.email, form.password)
    if (!account) {
      setError(customerAuthError || 'Usuario o contraseña incorrectos.')
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
          <h1>Iniciar sesión</h1>
          <p>Entrá con tu cuenta para guardar tus datos y seguir tus pedidos.</p>
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
  )
}
