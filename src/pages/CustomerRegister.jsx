import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoImg from '../assets/mercadobra.png'

export default function CustomerRegister() {
  const {
    customerUser,
    registerCustomer,
    customerAuthError,
    customerAuthLoading,
  } = useAuth()

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
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

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    const account = await registerCustomer({
      fullName: form.fullName,
      email: form.email,
      password: form.password,
    })

    if (!account) {
      setError(customerAuthError || 'No se pudo crear la cuenta')
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
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Zm6-6h4v2h-4V4h-2v4h-4v2h4v4h2v-4Z" fill="currentColor"/>
            </svg>
          </div>
          <h1>Crear cuenta</h1>
          <p>Registrate para guardar tus datos y cotizar más rápido en próximas compras.</p>
        </div>

        <form className="publish-form" onSubmit={handleSubmit} noValidate>
          {error && <p className="login-error" role="alert">{error}</p>}

          <div className="form-row">
            <label className="form-label" htmlFor="customer-register-name">Nombre y apellido</label>
            <input
              id="customer-register-name"
              className="form-input"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Ej: Juan Perez"
              autoComplete="name"
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="customer-register-email">Correo electrónico</label>
            <input
              id="customer-register-email"
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
            <label className="form-label" htmlFor="customer-register-password">Contraseña</label>
            <input
              id="customer-register-password"
              className="form-input"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="customer-register-confirm-password">Confirmar contraseña</label>
            <input
              id="customer-register-confirm-password"
              className="form-input"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repetí tu contraseña"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="cart-confirm-btn" disabled={customerAuthLoading}>
            {customerAuthLoading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p className="login-signup-hint">
            ¿Ya tenés cuenta? <Link to="/cliente/login">Ingresar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
