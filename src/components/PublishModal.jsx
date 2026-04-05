import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import { companyInitials } from '../utils/format'
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from '../data/constants'

const EMPTY_FORM = { name: '', category: 'Hormigón', price: '', unit: 'bolsa', stock: '0', description: '' }

export default function PublishModal({ onClose, onPublished, initialFormData = null }) {
  const { supplierUser, token } = useAuth()
  const { addProduct } = useProducts()
  const [formData, setFormData] = useState(() => ({ ...EMPTY_FORM, ...(initialFormData || {}) }))
  const [formSuccess, setFormSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (initialFormData) {
      setFormData({ ...EMPTY_FORM, ...initialFormData })
    }
  }, [initialFormData])

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.price) return
    setSubmitError('')

    try {
      const newProduct = await addProduct(formData, supplierUser, token)
      setFormSuccess(true)
      setTimeout(() => {
        setFormData(EMPTY_FORM)
        setFormSuccess(false)
        onClose()
        if (onPublished) onPublished(newProduct)
      }, 1800)
    } catch (error) {
      setSubmitError(error.message || 'No se pudo publicar el producto')
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="publish-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">Publicar producto</h2>
          <button className="cart-close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {formSuccess ? (
          <div className="publish-success">
            <div className="success-icon" aria-hidden="true">✓</div>
            <p>¡Producto publicado con éxito!</p>
            <p className="success-sub">Ya aparece en el catálogo.</p>
          </div>
        ) : (
          <form className="publish-form" onSubmit={handleSubmit} noValidate>
            {submitError && <p className="login-error" role="alert">{submitError}</p>}
            <div className="form-row">
              <label className="form-label">Empresa proveedora</label>
              <div className="form-locked">
                <span className="form-locked-avatar">
                  {supplierUser && companyInitials(supplierUser.company)}
                </span>
                <span className="form-locked-name">{supplierUser?.company}</span>
                <span className="form-locked-tag">Tu cuenta</span>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="pub-name">Nombre del producto *</label>
              <input
                id="pub-name"
                className="form-input"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Cemento Portland 50 kg"
                required
              />
            </div>

            <div className="form-row form-row--2col">
              <div>
                <label className="form-label" htmlFor="pub-category">Categoría</label>
                <select id="pub-category" className="form-input" name="category" value={formData.category} onChange={handleChange}>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="pub-unit">Unidad de venta</label>
                <select id="pub-unit" className="form-input" name="unit" value={formData.unit} onChange={handleChange}>
                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="pub-price">Precio (ARS) *</label>
              <input
                id="pub-price"
                className="form-input"
                name="price"
                type="number"
                min="1"
                value={formData.price}
                onChange={handleChange}
                placeholder="Ej: 8500"
                required
              />
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="pub-stock">Stock inicial</label>
              <input
                id="pub-stock"
                className="form-input"
                name="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={handleChange}
                placeholder="Ej: 100"
              />
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="pub-description">Descripción breve</label>
              <textarea
                id="pub-description"
                className="form-input form-textarea"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describí el producto, condiciones, stock disponible..."
                rows={3}
              />
            </div>

            <button type="submit" className="cart-confirm-btn">Publicar en el catálogo</button>
          </form>
        )}
      </div>
    </>
  )
}
