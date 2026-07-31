import { createContext, useCallback, useContext, useState, useEffect } from 'react'

const WishlistContext = createContext(null)
const WISHLIST_KEY = 'mercadobra-wishlist'

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      if (!stored) return []
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  // Save to localStorage whenever wishlist changes
  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  const addToWishlist = useCallback((productId) => {
    setWishlist((prev) => {
      if (!prev.includes(productId)) {
        return [...prev, productId]
      }
      return prev
    })
  }, [])

  const removeFromWishlist = useCallback((productId) => {
    setWishlist((prev) => prev.filter((id) => id !== productId))
  }, [])

  const toggleWishlist = useCallback((productId) => {
    setWishlist((prev) => (
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    ))
  }, [])

  function isInWishlist(productId) {
    return wishlist.includes(productId)
  }

  const clearWishlist = useCallback(() => {
    setWishlist([])
  }, [])

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist, clearWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  return useContext(WishlistContext)
}
