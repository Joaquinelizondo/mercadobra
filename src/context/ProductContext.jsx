import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { INITIAL_PRODUCTS, CARD_COLORS } from '../data/products'
import { createProduct, getProducts, removeProduct } from '../lib/api'

const ProductContext = createContext(null)
const FALLBACK_OUT_OF_STOCK_IDS = new Set([3, 8, 11])

function normalizeProduct(product) {
  return {
    ...product,
    id: Number(product.id),
    price: Number(product.price),
    stock: Number(
      product.stock ?? (FALLBACK_OUT_OF_STOCK_IDS.has(Number(product.id)) ? 0 : 20)
    ),
  }
}

export function ProductProvider({ children }) {
  const [productList, setProductList] = useState(INITIAL_PRODUCTS.map(normalizeProduct))
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productError, setProductError] = useState('')
  const [usingFallback, setUsingFallback] = useState(true)

  async function refreshProducts() {
    setLoadingProducts(true)
    setProductError('')
    try {
      const products = await getProducts()
      setProductList(products.map(normalizeProduct))
      setUsingFallback(false)
    } catch (error) {
      setProductList(INITIAL_PRODUCTS.map(normalizeProduct))
      setUsingFallback(true)
      setProductError(error.message || 'No se pudo cargar catálogo desde la API')
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    refreshProducts()
  }, [])

  async function addProduct(formData, supplierUser, token = '') {
    const providerId = Number(supplierUser?.providerId || formData.providerId || 0)
    const company = supplierUser?.company || formData.company || ''

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category,
      company,
      providerId,
      price: Number(formData.price),
      unit: formData.unit,
      stock: Number(formData.stock ?? 0),
      color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
    }

    try {
      const created = normalizeProduct(await createProduct(payload, token))
      setProductList((prev) => [created, ...prev])
      return created
    } catch (error) {
      if (usingFallback) {
        const newProduct = normalizeProduct({
          id: Date.now(),
          ...payload,
        })
        setProductList((prev) => [newProduct, ...prev])
        return newProduct
      }
      throw error
    }
  }

  async function deleteProduct(id, token = '') {
    try {
      await removeProduct(id, token)
    } catch (error) {
      if (!usingFallback) {
        throw error
      }
    }

    setProductList((prev) => prev.filter((p) => p.id !== id))
  }

  const value = useMemo(
    () => ({
      productList,
      addProduct,
      deleteProduct,
      refreshProducts,
      loadingProducts,
      productError,
      usingFallback,
    }),
    [productList, loadingProducts, productError, usingFallback]
  )

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  )
}

export function useProducts() {
  return useContext(ProductContext)
}
