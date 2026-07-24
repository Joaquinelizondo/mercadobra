import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OxidaWordmark from '../components/OxidaWordmark'

export default function AdminLogin() {
  const { adminUser, loginAdmin, adminAuthError, adminAuthLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/admin/productos'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (adminUser) {
      navigate(redirect, { replace: true })
    }
  }, [adminUser, navigate, redirect])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const account = await loginAdmin(form.email, form.password)
    if (!account) {
      setError(adminAuthError || 'Credenciales de admin incorrectas.')
      return
    }
    navigate(redirect, { replace: true })
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Link to="/" className="admin-login-oxida">
          <OxidaWordmark />
        </Link>

        <div className="login-card-header">
          <div className="login-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z" fill="currentColor"/>
            </svg>
          </div>
          <h1>Administrá tu tienda Oxida</h1>
          <p>Cargá productos, fotos, precios y disponibilidad desde un único lugar.</p>
        </div>

        <form className="publish-form" onSubmit={handleSubmit} noValidate>
          {error && <p className="login-error" role="alert">{error}</p>}

          <div className="form-row">
            <label className="form-label" htmlFor="admin-login-email">Usuario admin</label>
            <input
              id="admin-login-email"
              className="form-input"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@mercadobra.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="admin-login-password">Contraseña</label>
            <input
              id="admin-login-password"
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

          <button type="submit" className="cart-confirm-btn" disabled={adminAuthLoading}>
            {adminAuthLoading ? 'Validando...' : 'Entrar al panel admin'}
          </button>
        </form>
      </div>
    </div>
  )
}
