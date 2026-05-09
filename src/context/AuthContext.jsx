import { createContext, useContext, useMemo, useState } from 'react'
import { loginAdmin, loginCustomer, loginSupplier, registerCustomer } from '../lib/api'

const AuthContext = createContext(null)
const SUPPLIER_SESSION_KEY = 'mercadobra-supplier-session'
const CUSTOMER_SESSION_KEY = 'mercadobra-customer-session'
const ADMIN_SESSION_KEY = 'mercadobra-admin-session'

function getInitialSession(storageKey, userKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return { user: null, token: '' }
    const parsed = JSON.parse(raw)
    return {
      user: parsed?.[userKey] || null,
      token: parsed?.token || '',
    }
  } catch {
    return { user: null, token: '' }
  }
}

export function AuthProvider({ children }) {
  const supplierInitial = getInitialSession(SUPPLIER_SESSION_KEY, 'supplierUser')
  const customerInitial = getInitialSession(CUSTOMER_SESSION_KEY, 'customerUser')
  const adminInitial = getInitialSession(ADMIN_SESSION_KEY, 'adminUser')

  const [supplierUser, setSupplierUser] = useState(supplierInitial.user)
  const [token, setToken] = useState(supplierInitial.token)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [customerUser, setCustomerUser] = useState(customerInitial.user)
  const [customerToken, setCustomerToken] = useState(customerInitial.token)
  const [customerAuthError, setCustomerAuthError] = useState('')
  const [customerAuthLoading, setCustomerAuthLoading] = useState(false)

  const [adminUser, setAdminUser] = useState(adminInitial.user)
  const [adminToken, setAdminToken] = useState(adminInitial.token)
  const [adminAuthError, setAdminAuthError] = useState('')
  const [adminAuthLoading, setAdminAuthLoading] = useState(false)

  function persistSession(storageKey, userKey, nextUser, nextToken) {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        [userKey]: nextUser,
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
      persistSession(SUPPLIER_SESSION_KEY, 'supplierUser', response.user, response.token)
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
    localStorage.removeItem(SUPPLIER_SESSION_KEY)
  }

  async function loginCustomerAccount(email, password) {
    setCustomerAuthLoading(true)
    setCustomerAuthError('')
    try {
      const response = await loginCustomer(email.trim().toLowerCase(), password)
      setCustomerUser(response.user)
      setCustomerToken(response.token)
      persistSession(CUSTOMER_SESSION_KEY, 'customerUser', response.user, response.token)
      return response.user
    } catch (error) {
      setCustomerAuthError(error.message || 'No se pudo iniciar sesión')
      return null
    } finally {
      setCustomerAuthLoading(false)
    }
  }

  async function registerCustomerAccount(payload) {
    setCustomerAuthLoading(true)
    setCustomerAuthError('')
    try {
      const response = await registerCustomer(payload)
      setCustomerUser(response.user)
      setCustomerToken(response.token)
      persistSession(CUSTOMER_SESSION_KEY, 'customerUser', response.user, response.token)
      return response.user
    } catch (error) {
      setCustomerAuthError(error.message || 'No se pudo crear la cuenta')
      return null
    } finally {
      setCustomerAuthLoading(false)
    }
  }

  function logoutCustomer() {
    setCustomerUser(null)
    setCustomerToken('')
    setCustomerAuthError('')
    localStorage.removeItem(CUSTOMER_SESSION_KEY)
  }

  async function loginAdminAccount(email, password) {
    setAdminAuthLoading(true)
    setAdminAuthError('')
    try {
      const response = await loginAdmin(email.trim().toLowerCase(), password)
      setAdminUser(response.user)
      setAdminToken(response.token)
      persistSession(ADMIN_SESSION_KEY, 'adminUser', response.user, response.token)
      return response.user
    } catch (error) {
      setAdminAuthError(error.message || 'No se pudo iniciar sesión como admin')
      return null
    } finally {
      setAdminAuthLoading(false)
    }
  }

  function logoutAdmin() {
    setAdminUser(null)
    setAdminToken('')
    setAdminAuthError('')
    localStorage.removeItem(ADMIN_SESSION_KEY)
  }

  const value = useMemo(
    () => ({
      supplierUser,
      token,
      login,
      logout,
      authError,
      authLoading,
      customerUser,
      customerToken,
      customerAuthError,
      customerAuthLoading,
      loginCustomer: loginCustomerAccount,
      registerCustomer: registerCustomerAccount,
      logoutCustomer,
      adminUser,
      adminToken,
      adminAuthError,
      adminAuthLoading,
      loginAdmin: loginAdminAccount,
      logoutAdmin,
    }),
    [
      supplierUser,
      token,
      authError,
      authLoading,
      customerUser,
      customerToken,
      customerAuthError,
      customerAuthLoading,
      adminUser,
      adminToken,
      adminAuthError,
      adminAuthLoading,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return (
    useContext(AuthContext) || {
      supplierUser: null,
      token: '',
      login: async () => null,
      logout: () => {},
      authError: '',
      authLoading: false,
      customerUser: null,
      customerToken: '',
      customerAuthError: '',
      customerAuthLoading: false,
      loginCustomer: async () => null,
      registerCustomer: async () => null,
      logoutCustomer: () => {},
      adminUser: null,
      adminToken: '',
      adminAuthError: '',
      adminAuthLoading: false,
      loginAdmin: async () => null,
      logoutAdmin: () => {},
    }
  )
}
