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

          <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>
            <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', color: '#0f172a' }}>Credenciales de Administrador</span>
            <span style={{ fontSize: '0.8rem' }}>admin@mercadobra.com / admin123</span>
            <button
              type="button"
              onClick={() => { setForm({ email: 'admin@mercadobra.com', password: 'admin123' }); setError(''); }}
              style={{ display: 'block', margin: '0.5rem auto 0', padding: '0.35rem 0.85rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Completar datos admin
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
