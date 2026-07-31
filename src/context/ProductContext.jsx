import { createContext, useContext, useEffect, useState } from 'react'
import { INITIAL_PRODUCTS, CARD_COLORS } from '../data/products'
import { createProduct, getProducts, removeProduct, updateProduct } from '../lib/api'

const ProductContext = createContext(null)
const FALLBACK_OUT_OF_STOCK_IDS = new Set([3, 8, 11])

function normalizeProduct(product) {
  const normalizedCurrency = String(product.currency || 'UYU').toUpperCase()
  return {
    ...product,
    id: Number(product.id),
    price: Number(product.price),
    currency: normalizedCurrency === 'USD' ? 'USD' : 'UYU',
    stock: Number(
      product.stock ?? (FALLBACK_OUT_OF_STOCK_IDS.has(Number(product.id)) ? 0 : 20)
    ),
    images: Array.isArray(product.images)
      ? product.images
      : product.image
        ? [{ url: product.image, alt: product.name }]
        : [],
    sku: String(product.sku || ''),
    status: product.status || 'published',
    productType: product.productType || 'ready',
    leadTimeDays: Number(product.leadTimeDays ?? product.deliveryDays ?? 3),
    weightKg: product.weightKg == null ? '' : Number(product.weightKg),
    dimensions: product.dimensions && typeof product.dimensions === 'object' ? product.dimensions : {},
    configurable: Boolean(product.configurable),
    variants: Array.isArray(product.variants) ? product.variants : [],
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
      const remoteProducts = products.map(normalizeProduct)
      const localByName = new Map(INITIAL_PRODUCTS.map((product) => [product.name.trim().toLowerCase(), product]))
      const enrichedRemoteProducts = remoteProducts.map((product) => {
        const localProduct = localByName.get(product.name.trim().toLowerCase())
        return localProduct && product.images.length === 0
          ? normalizeProduct({ ...product, images: localProduct.images })
          : product
      })
      const remoteNames = new Set(enrichedRemoteProducts.map((product) => product.name.trim().toLowerCase()))
      const oxidaCollection = INITIAL_PRODUCTS
        .filter((product) => !remoteNames.has(product.name.trim().toLowerCase()))
        .map(normalizeProduct)
      setProductList([...oxidaCollection, ...enrichedRemoteProducts])
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
    const rawProviderId = supplierUser?.providerId ?? formData.providerId
    const providerId = rawProviderId === null || rawProviderId === undefined || rawProviderId === ''
      ? null
      : Number(rawProviderId)
    const company = supplierUser?.company || formData.company || ''

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category,
      company,
      providerId,
      price: Number(formData.price),
      currency: String(formData.currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU',
      unit: formData.unit,
      stock: Number(formData.stock ?? 0),
      images: Array.isArray(formData.images) ? formData.images : [],
      sku: String(formData.sku || '').trim(),
      status: formData.status || 'published',
      productType: formData.productType || 'ready',
      leadTimeDays: Number(formData.leadTimeDays ?? 3),
      weightKg: formData.weightKg === '' ? null : Number(formData.weightKg),
      dimensions: formData.dimensions || {},
      configurable: Boolean(formData.configurable),
      variants: Array.isArray(formData.variants) ? formData.variants : [],
      color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
    }

    try {
      const response = await createProduct(payload, token)
      // Si el backend responde { product, message }
      const created = normalizeProduct(response.product || response)
      setProductList((prev) => [created, ...prev])
      return { product: created, message: response.message }
    } catch (error) {
      if (usingFallback) {
        const newProduct = normalizeProduct({
          id: Date.now(),
          ...payload,
        })
        setProductList((prev) => [newProduct, ...prev])
        return { product: newProduct, message: 'Producto guardado (modo offline)' }
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

  async function editProduct(id, formData, supplierUser, token = '') {
    const payload = {
      name: String(formData.name || '').trim(),
      description: String(formData.description || '').trim(),
      category: formData.category,
      company: supplierUser?.company || formData.company || '',
      providerId: (() => {
        const rawProviderId = supplierUser?.providerId ?? formData.providerId
        return rawProviderId === null || rawProviderId === undefined || rawProviderId === ''
          ? null
          : Number(rawProviderId)
      })(),
      price: Number(formData.price),
      currency: String(formData.currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU',
      unit: formData.unit,
      stock: Number(formData.stock ?? 0),
      images: Array.isArray(formData.images) ? formData.images : [],
      sku: String(formData.sku || '').trim(),
      status: formData.status || 'published',
      productType: formData.productType || 'ready',
      leadTimeDays: Number(formData.leadTimeDays ?? 3),
      weightKg: formData.weightKg === '' ? null : Number(formData.weightKg),
      dimensions: formData.dimensions || {},
      configurable: Boolean(formData.configurable),
      variants: Array.isArray(formData.variants) ? formData.variants : [],
    }

    try {
      const updated = normalizeProduct(await updateProduct(id, payload, token))
      setProductList((prev) => prev.map((product) => (product.id === updated.id ? updated : product)))
      return updated
    } catch (error) {
      if (!usingFallback) {
        throw error
      }

      const updated = normalizeProduct({
        ...payload,
        id: Number(id),
      })
      setProductList((prev) => prev.map((product) => (product.id === Number(id) ? { ...product, ...updated } : product)))
      return updated
    }
  }

  const value = {
      productList,
      addProduct,
      deleteProduct,
      editProduct,
      refreshProducts,
      loadingProducts,
      productError,
      usingFallback,
  }

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  )
}

export function useProducts() {
  return useContext(ProductContext)
}
