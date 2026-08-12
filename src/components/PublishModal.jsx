import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductContext'
import { companyInitials } from '../utils/format'
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from '../data/constants'

const EMPTY_FORM = {
  name: '', sku: '', category: 'Mobiliario', price: '', currency: 'UYU', unit: 'unidad',
  company: '', providerId: '',
  stock: '0', status: 'published', productType: 'ready', leadTimeDays: '7', weightKg: '',
  dimensions: { width: '', height: '', depth: '' }, configurable: false,
  ribbonEnabled: false, ribbonText: '',
  slideEnabled: false, slideTitle: '', slideSubtitle: '', slideOrder: '0',
  description: '', images: [], variants: [],
}

export default function PublishModal({ onClose, onPublished, initialFormData = null }) {
  const { supplierUser, token, adminUser, adminToken } = useAuth()
  const { addProduct, editProduct } = useProducts()
  const [formData, setFormData] = useState(() => ({ ...EMPTY_FORM, ...(initialFormData || {}) }))
  const [formSuccess, setFormSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const isEditMode = Boolean(initialFormData?.id)
  // Admin and supplier sessions may coexist in localStorage. Inside the admin
  // catalog, always use the admin identity instead of a stale supplier session.
  const publisher = adminUser ? null : supplierUser
  const publisherToken = adminUser ? adminToken : token

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleDimension(event) {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, dimensions: { ...previous.dimensions, [name]: value } }))
  }

  function addVariant() {
    setFormData((previous) => ({
      ...previous,
      variants: [...previous.variants, {
        id: `variant-${Date.now()}`, name: '', sku: '', price: previous.price || '', stock: '0',
        attributes: { medida: '', color: '', terminacion: '' },
      }],
    }))
  }

  function updateVariant(index, field, value) {
    setFormData((previous) => ({
      ...previous,
      variants: previous.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) return variant
        if (field.startsWith('attributes.')) {
          const attribute = field.split('.')[1]
          return { ...variant, attributes: { ...variant.attributes, [attribute]: value } }
        }
        return { ...variant, [field]: value }
      }),
    }))
  }

  function removeVariant(index) {
    setFormData((previous) => ({ ...previous, variants: previous.variants.filter((_, variantIndex) => variantIndex !== index) }))
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
    setSubmitError('')
    if (!formData.name.trim() || !formData.price || !formData.description.trim()) {
      setSubmitError('Completá nombre, precio y descripción.')
      return
    }
    if (adminUser && !String(formData.company || '').trim()) {
      setSubmitError('Indicá la empresa proveedora del producto.')
      return
    }

    try {
      const savedProduct = isEditMode
        ? await editProduct(initialFormData.id, formData, publisher, publisherToken)
        : await addProduct(formData, publisher, publisherToken)
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
            {adminUser ? (
              <div className="form-row form-row--2col">
                <div>
                  <label className="form-label" htmlFor="pub-company">Empresa proveedora *</label>
                  <input id="pub-company" className="form-input" name="company" value={formData.company || ''} onChange={handleChange} placeholder="Ej: Oxida Studio" required />
                </div>
                <div>
                  <label className="form-label" htmlFor="pub-provider-id">ID de proveedor</label>
                  <input id="pub-provider-id" className="form-input" name="providerId" type="number" min="1" value={Number.isFinite(Number(formData.providerId)) && Number(formData.providerId) > 0 ? formData.providerId : ''} onChange={handleChange} placeholder="Opcional · Oxida Studio: 10" />
                </div>
              </div>
            ) : (
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
            )}

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
                <label className="form-label" htmlFor="pub-sku">SKU</label>
                <input id="pub-sku" className="form-input" name="sku" value={formData.sku} onChange={handleChange} placeholder="Ej: OX-CAVA-001" />
              </div>
              <div>
                <label className="form-label" htmlFor="pub-status">Estado</label>
                <select id="pub-status" className="form-input" name="status" value={formData.status} onChange={handleChange}>
                  <option value="published">Publicado</option>
                  <option value="draft">Borrador</option>
                  <option value="out_of_stock">Sin stock</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
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

            <div className="form-row form-row--2col">
              <div>
                <label className="form-label" htmlFor="pub-type">Tipo de venta</label>
                <select id="pub-type" className="form-input" name="productType" value={formData.productType} onChange={handleChange}>
                  <option value="ready">Compra directa</option>
                  <option value="made_to_order">Fabricación por pedido</option>
                  <option value="custom_quote">Requiere cotización</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="pub-lead-time">Plazo estimado (días)</label>
                <input id="pub-lead-time" className="form-input" name="leadTimeDays" type="number" min="0" value={formData.leadTimeDays} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row form-row--3col">
              <div><label className="form-label">Ancho (cm)</label><input className="form-input" name="width" type="number" min="0" value={formData.dimensions?.width || ''} onChange={handleDimension} /></div>
              <div><label className="form-label">Alto (cm)</label><input className="form-input" name="height" type="number" min="0" value={formData.dimensions?.height || ''} onChange={handleDimension} /></div>
              <div><label className="form-label">Profundidad (cm)</label><input className="form-input" name="depth" type="number" min="0" value={formData.dimensions?.depth || ''} onChange={handleDimension} /></div>
            </div>

            <label className="product-configurable-check">
              <input type="checkbox" name="configurable" checked={formData.configurable} onChange={handleChange} />
              <span><strong>Producto personalizable</strong><small>Permite solicitar otras medidas, colores o terminaciones.</small></span>
            </label>

            <div className="product-ribbon-editor">
              <label className="product-configurable-check">
                <input type="checkbox" name="ribbonEnabled" checked={formData.ribbonEnabled} onChange={handleChange} />
                <span><strong>Mostrar listón promocional</strong><small>Aparece cruzado sobre la foto del producto.</small></span>
              </label>
              {formData.ribbonEnabled && (
                <div>
                  <label className="form-label" htmlFor="pub-ribbon-text">Texto del listón</label>
                  <input id="pub-ribbon-text" className="form-input" name="ribbonText" value={formData.ribbonText} onChange={handleChange} maxLength="24" placeholder="Ej: 50% OFF, Nuevo, Exclusivo" />
                </div>
              )}
            </div>

            <div className="product-ribbon-editor product-slide-editor">
              <label className="product-configurable-check">
                <input type="checkbox" name="slideEnabled" checked={formData.slideEnabled} onChange={handleChange} />
                <span><strong>Mostrar en portada editorial</strong><small>Usa la primera foto como diapositiva debajo del cotizador.</small></span>
              </label>
              {formData.slideEnabled && <div className="form-row">
                <label className="form-label" htmlFor="pub-slide-title">Título de impacto</label>
                <input id="pub-slide-title" className="form-input" name="slideTitle" value={formData.slideTitle} onChange={handleChange} maxLength="80" placeholder="Ej: El arte de guardar bien." required />
                <label className="form-label" htmlFor="pub-slide-subtitle">Subtítulo</label>
                <textarea id="pub-slide-subtitle" className="form-input form-textarea" name="slideSubtitle" value={formData.slideSubtitle} onChange={handleChange} maxLength="180" rows="2" placeholder="Una frase breve, precisa y elegante." required />
                <label className="form-label" htmlFor="pub-slide-order">Orden</label>
                <input id="pub-slide-order" className="form-input" type="number" min="0" max="999" name="slideOrder" value={formData.slideOrder} onChange={handleChange} />
              </div>}
            </div>

            <div className="product-variants-editor">
              <div className="product-variants-head">
                <div><strong>Variantes</strong><span>Precio y stock para cada combinación.</span></div>
                <button type="button" onClick={addVariant}>＋ Agregar variante</button>
              </div>
              {formData.variants.map((variant, index) => (
                <div className="product-variant-row" key={variant.id || index}>
                  <input className="form-input" value={variant.name || ''} onChange={(event) => updateVariant(index, 'name', event.target.value)} placeholder="Nombre" />
                  <input className="form-input" value={variant.sku || ''} onChange={(event) => updateVariant(index, 'sku', event.target.value)} placeholder="SKU" />
                  <input className="form-input" type="number" value={variant.price ?? ''} onChange={(event) => updateVariant(index, 'price', Number(event.target.value))} placeholder="Precio" />
                  <input className="form-input" type="number" value={variant.stock ?? ''} onChange={(event) => updateVariant(index, 'stock', Number(event.target.value))} placeholder="Stock" />
                  <input className="form-input" value={variant.attributes?.medida || ''} onChange={(event) => updateVariant(index, 'attributes.medida', event.target.value)} placeholder="Medida" />
                  <input className="form-input" value={variant.attributes?.color || ''} onChange={(event) => updateVariant(index, 'attributes.color', event.target.value)} placeholder="Color" />
                  <input className="form-input" value={variant.attributes?.terminacion || ''} onChange={(event) => updateVariant(index, 'attributes.terminacion', event.target.value)} placeholder="Terminación" />
                  <button type="button" className="product-variant-remove" onClick={() => removeVariant(index)} aria-label="Quitar variante">×</button>
                </div>
              ))}
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
                required
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
