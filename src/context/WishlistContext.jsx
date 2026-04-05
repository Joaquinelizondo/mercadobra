import { createContext, useContext, useState, useEffect } from 'react'

const WishlistContext = createContext(null)
const WISHLIST_KEY = 'mercadobra-wishlist'

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setWishlist(parsed)
        }
      }
    } catch {
      setWishlist([])
    }
  }, [])

  // Save to localStorage whenever wishlist changes
  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  function addToWishlist(productId) {
    setWishlist((prev) => {
      if (!prev.includes(productId)) {
        return [...prev, productId]
      }
      return prev
    })
  }

  function removeFromWishlist(productId) {
    setWishlist((prev) => prev.filter((id) => id !== productId))
  }

  function toggleWishlist(productId) {
    if (wishlist.includes(productId)) {
      removeFromWishlist(productId)
    } else {
      addToWishlist(productId)
    }
  }

  function isInWishlist(productId) {
    return wishlist.includes(productId)
  }

  function clearWishlist() {
    setWishlist([])
  }

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
