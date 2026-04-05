import { createContext, useContext, useMemo, useState } from 'react'
import { loginSupplier } from '../lib/api'

const AuthContext = createContext(null)
const SESSION_KEY = 'mercadobra-supplier-session'

function getInitialSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return { supplierUser: null, token: '' }
    const parsed = JSON.parse(raw)
    return {
      supplierUser: parsed?.supplierUser || null,
      token: parsed?.token || '',
    }
  } catch {
    return { supplierUser: null, token: '' }
  }
}

export function AuthProvider({ children }) {
  const initial = getInitialSession()
  const [supplierUser, setSupplierUser] = useState(initial.supplierUser)
  const [token, setToken] = useState(initial.token)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  function persistSession(nextUser, nextToken) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        supplierUser: nextUser,
        token: nextToken,
      })
    )
  }

  async function login(email, password) {
    setAuthLoading(true)
    setAuthError('')
    try {
      const response = await loginSupplier(email.trim().toLowerCase(), password)
      setSupplierUser(response.user)
      setToken(response.token)
      persistSession(response.user, response.token)
      return response.user
    } catch (error) {
      setAuthError(error.message || 'No se pudo iniciar sesión')
      return null
    } finally {
      setAuthLoading(false)
    }
  }

  function logout() {
    setSupplierUser(null)
    setToken('')
    setAuthError('')
    localStorage.removeItem(SESSION_KEY)
  }

  const value = useMemo(
    () => ({ supplierUser, token, login, logout, authError, authLoading }),
    [supplierUser, token, authError, authLoading]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
