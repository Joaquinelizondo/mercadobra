import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import { companyInitials } from '../utils/format'
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from '../data/constants'

const EMPTY_FORM = { name: '', category: 'Mobiliario', price: '', currency: 'UYU', unit: 'unidad', stock: '0', description: '', images: [] }

export default function PublishModal({ onClose, onPublished, initialFormData = null }) {
  const { supplierUser, token, adminUser, adminToken } = useAuth()
  const { addProduct, editProduct } = useProducts()
  const [formData, setFormData] = useState(() => ({ ...EMPTY_FORM, ...(initialFormData || {}) }))
  const [formSuccess, setFormSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const isEditMode = Boolean(initialFormData?.id)
  const publisher = supplierUser || (adminUser ? { company: 'Oxida Studio', providerId: null } : null)
  const publisherToken = supplierUser ? token : adminToken

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handleImages(event) {
    const files = Array.from(event.target.files || []).slice(0, 5)
    if (files.some((file) => file.size > 2 * 1024 * 1024)) {
      setSubmitError('Cada imagen debe pesar menos de 2 MB.')
      event.target.value = ''
      return
    }
    setSubmitError('')
    Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ url: reader.result, alt: formData.name || file.name })
      reader.onerror = reject
      reader.readAsDataURL(file)
    }))).then((images) => setFormData((previous) => ({ ...previous, images })))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.price) return
    setSubmitError('')

    try {
      const savedProduct = isEditMode
        ? await editProduct(initialFormData.id, { ...formData, company: publisher?.company }, publisher, publisherToken)
        : await addProduct({ ...formData, company: publisher?.company }, publisher, publisherToken)
      setFormSuccess(true)
      setTimeout(() => {
        setFormData(EMPTY_FORM)
        setFormSuccess(false)
        onClose()
        if (onPublished) onPublished(savedProduct)
      }, 1800)
    } catch (error) {
      setSubmitError(error.message || (isEditMode ? 'No se pudo actualizar el producto' : 'No se pudo publicar el producto'))
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="publish-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{isEditMode ? 'Editar producto' : 'Publicar producto'}</h2>
          <button className="cart-close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {formSuccess ? (
          <div className="publish-success">
            <div className="success-icon" aria-hidden="true">✓</div>
            <p>{isEditMode ? '¡Producto actualizado con éxito!' : '¡Producto publicado con éxito!'}</p>
            <p className="success-sub">
              {isEditMode ? 'Los cambios ya están visibles en tu catálogo.' : 'Ya aparece en el catálogo.'}
            </p>
          </div>
        ) : (
          <form className="publish-form" onSubmit={handleSubmit} noValidate>
            {submitError && <p className="login-error" role="alert">{submitError}</p>}
            <div className="form-row">
              <label className="form-label">Empresa proveedora</label>
              <div className="form-locked">
                <span className="form-locked-avatar">
                  {publisher && companyInitials(publisher.company)}
                </span>
                <span className="form-locked-name">{publisher?.company}</span>
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

            <div className="form-row form-row--2col">
              <div>
                <label className="form-label" htmlFor="pub-price">Precio *</label>
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
              <div>
                <label className="form-label" htmlFor="pub-currency">Moneda</label>
                <select
                  id="pub-currency"
                  className="form-input"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="UYU">Pesos uruguayos (UYU)</option>
                  <option value="USD">Dolares (USD)</option>
                </select>
              </div>
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
              <label className="form-label" htmlFor="pub-images">Fotos del producto</label>
              <label className="product-photo-picker" htmlFor="pub-images">
                <strong>Subir fotos</strong>
                <span>Hasta 5 imágenes JPG, PNG o WEBP (máx. 2 MB). La primera será la portada.</span>
              </label>
              <input id="pub-images" className="product-photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImages} />
              {formData.images?.length > 0 && (
                <div className="product-photo-preview">
                  {formData.images.map((image, index) => (
                    <div key={`${image.url.slice(0, 30)}-${index}`}>
                      <img src={image.url} alt={image.alt || `Vista previa ${index + 1}`} />
                      {index === 0 && <span>Portada</span>}
                    </div>
                  ))}
                </div>
              )}
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

            <button type="submit" className="cart-confirm-btn">
              {isEditMode ? 'Guardar cambios' : 'Publicar en el catálogo'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
