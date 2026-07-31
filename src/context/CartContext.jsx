import { createContext, useCallback, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

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
      return [...prev, { ...product, quantity: 1 }]
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
          price: Number(latest.price),
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
