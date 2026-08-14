import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { discountedPrice } from '../utils/pricing'

const CartContext = createContext(null)
const CART_STORAGE_KEY = 'mercadobra-cart-v1'

function readStoredCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]')
    if (!Array.isArray(stored)) return []
    return stored
      .filter((item) => Number(item?.id) > 0 && Number(item?.quantity) > 0)
      .map((item) => ({
        id: Number(item.id),
        name: String(item.name || 'Producto'),
        company: String(item.company || ''),
        price: discountedPrice(item.originalPrice ?? item.price, item.discountPercent),
        originalPrice: Number(item.originalPrice ?? item.price) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        currency: String(item.currency || 'UYU'),
        unit: String(item.unit || 'unidad'),
        stock: Math.max(0, Number(item.stock) || 0),
        color: String(item.color || '#a8522e'),
        status: String(item.status || 'published'),
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      }))
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY)
    return []
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(readStoredCart)
  const [cartOpen, setCartOpen] = useState(false)

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  useEffect(() => {
    if (cartItems.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY)
      return
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  }, [cartItems])

  function addToCart(product) {
    const availableStock = Math.max(0, Number(product.stock) || 0)
    const existing = cartItems.find((item) => item.id === product.id)
    if (availableStock <= 0 || Number(existing?.quantity || 0) >= availableStock) return false

    setCartItems((prev) => {
      const current = prev.find((i) => i.id === product.id)
      if (current) {
        if (current.quantity >= availableStock) return prev
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, {
        ...product,
        originalPrice: Number(product.price) || 0,
        price: discountedPrice(product.price, product.discountPercent),
        quantity: 1,
      }]
    })
    return true
  }

  function changeQty(id, delta) {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i
          const availableStock = Math.max(0, Number(i.stock) || 0)
          const nextQuantity = Math.min(i.quantity + delta, availableStock)
          return { ...i, quantity: nextQuantity }
        })
        .filter((i) => i.quantity > 0)
    )
  }

  const syncCartInventory = useCallback((products) => {
    const latestById = new Map(products.map((product) => [Number(product.id), product]))
    setCartItems((prev) => prev
      .map((item) => {
        const latest = latestById.get(Number(item.id))
        if (!latest || latest.status !== 'published') return { ...item, stock: 0, quantity: 0 }
        const stock = Math.max(0, Number(latest.stock) || 0)
        return {
          ...item,
          stock,
          originalPrice: Number(latest.price),
          discountPercent: Number(latest.discountPercent) || 0,
          price: discountedPrice(latest.price, latest.discountPercent),
          currency: latest.currency,
          quantity: Math.min(item.quantity, stock),
        }
      })
      .filter((item) => item.quantity > 0))
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  return (
    <CartContext.Provider
      value={{ cartItems, cartCount, cartTotal, cartOpen, setCartOpen, addToCart, changeQty, syncCartInventory, clearCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
