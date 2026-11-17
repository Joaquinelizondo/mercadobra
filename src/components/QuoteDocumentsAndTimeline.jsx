import { useMemo, useState, useRef } from 'react'
import './QuoteDocumentsAndTimeline.css'

export const ATTACHMENT_CATEGORIES = {
  planos: { label: 'Planos Técnicos', icon: '📐', desc: 'Archivos CAD, DWG, DXF y PDF con despieces' },
  cotizacion: { label: 'Cotización & Costos', icon: '💰', desc: 'Presupuestos formales, planillas y cómputos' },
  vistas: { label: 'Vistas & Renders 3D', icon: '🖼️', desc: 'Perspectivas 3D, renders y fotos de referencia' },
  especificaciones: { label: 'Memorias & Pliegos', icon: '📑', desc: 'Especificaciones técnicas de materiales y garantías' },
  general: { label: 'Otros Documentos', icon: '📎', desc: 'Comprobantes, actas y notas adicionales' }
}

export const PROJECT_STAGES = {
  relevamiento: { label: 'Etapa 1 · Relevamiento & Requerimientos', short: 'Relevamiento' },
  anteproyecto: { label: 'Etapa 2 · Anteproyecto & Vistas 3D', short: 'Anteproyecto' },
  cotizacion: { label: 'Etapa 3 · Cotización Formal & Costeo', short: 'Cotización' },
  aprobacion: { label: 'Etapa 4 · Aprobación & Planos de Taller', short: 'Aprobación' },
  fabricacion: { label: 'Etapa 5 · Fabricación & Montaje', short: 'Fabricación' }
}

export const QUOTE_STATUS_INFO = {
  in_progress: { label: 'En revisión / Requerimientos', color: '#b45309', bg: '#fef3c7' },
  sent: { label: 'Cotizada / Presupuesto emitido', color: '#0369a1', bg: '#e0f2fe' },
  accepted: { label: 'Presupuesto aprobado', color: '#166534', bg: '#dcfce7' },
  project_in_progress: { label: 'En fabricación / Obra activa', color: '#0f766e', bg: '#ccfbf1' },
  completed: { label: 'Finalizada / Entregada', color: '#374151', bg: '#f3f4f6' },
  rejected: { label: 'Rechazada', color: '#991b1b', bg: '#fee2e2' },
  cancelled: { label: 'Cancelada', color: '#4b5563', bg: '#e5e7eb' }
}

function formatDateTime(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return String(dateVal)
  return `${d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })} hs`
}

function getFileIcon(filename = '') {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.dwg') || lower.endsWith('.dxf') || lower.endsWith('.cad')) return '📐'
  if (lower.endsWith('.pdf')) return '📄'
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) return '📊'
  if (lower.match(/\.(png|jpe?g|webp|gif|svg)$/)) return '🖼️'
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return '📝'
  return '📎'
}

export default function QuoteDocumentsAndTimeline({
  quote,
  messages = [],
  onSendMessage,
  onUploadDocument,
  isAdmin = false,
}) {
  const [activeTab, setActiveTab] = useState('documents') // 'documents' | 'timeline'
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStage, setSelectedStage] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal / Form state for uploading dedicated documents
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('planos')
  const [uploadStage, setUploadStage] = useState('anteproyecto')
  const [uploadNote, setUploadNote] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  // Timeline comment form state
  const [commentText, setCommentText] = useState('')
  const [commentCategory, setCommentCategory] = useState('general')
  const [commentStage, setCommentStage] = useState('anteproyecto')
  const [commentFiles, setCommentFiles] = useState([])
  const [sendingComment, setSendingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const commentFileRef = useRef(null)

  // Consolidate documents from quote.attachments + messages[].attachments
  const allDocuments = useMemo(() => {
    const list = []
    const seen = new Set()

    function addDoc(doc, sourceRole = 'admin', fallbackDate = null) {
      if (!doc) return
      const url = doc.url || doc.data || ''
      const name = doc.name || 'Archivo adjunto'
      const key = `${name}::${url.slice(0, 60)}`
      if (seen.has(key)) return
      seen.add(key)

      list.push({
        id: doc.id || key,
        name,
        url: url.startsWith('http') ? url : (doc.data || url),
        data: doc.data,
        type: doc.type || 'application/octet-stream',
        category: doc.category || (name.toLowerCase().endsWith('.dwg') ? 'planos' : (name.toLowerCase().endsWith('.pdf') ? 'cotizacion' : 'general')),
        stage: doc.stage || 'anteproyecto',
        uploadedAt: doc.uploadedAt || fallbackDate || quote?.updatedAt || quote?.createdAt || new Date().toISOString(),
        authorRole: doc.authorRole || sourceRole,
        size: doc.size || null
      })
    }

    // 1. From quote.attachments
    const quoteAtts = Array.isArray(quote?.attachments)
      ? quote.attachments
      : typeof quote?.attachments === 'string'
      ? (() => { try { return JSON.parse(quote.attachments) || [] } catch { return [] } })()
      : []

    quoteAtts.forEach((doc) => addDoc(doc, 'admin', quote?.createdAt))

    // 2. From messages
    messages.forEach((msg) => {
      const atts = Array.isArray(msg.attachments) ? msg.attachments : []
      atts.forEach((doc) => addDoc(doc, msg.authorRole, msg.createdAt))
    })

    return list.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
  }, [quote, messages])

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return allDocuments.filter((doc) => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory
      const matchesStage = selectedStage === 'all' || doc.stage === selectedStage
      const matchesSearch = !query || doc.name.toLowerCase().includes(query)
      return matchesCategory && matchesStage && matchesSearch
    })
  }, [allDocuments, selectedCategory, selectedStage, searchQuery])

  // Helper to read multiple files to Base64 dataURL
  function readFilesAsDataUrl(fileList, category, stage) {
    return Promise.all(
      Array.from(fileList || []).map(
        (file) =>
          new Promise((resolve, reject) => {
            if (file.size > 15 * 1024 * 1024) {
              return reject(new Error(`El archivo ${file.name} supera el límite de 15 MB.`))
            }
            const reader = new FileReader()
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type,
                category,
                stage,
                uploadedAt: new Date().toISOString(),
                data: reader.result,
                size: file.size,
              })
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
      )
    )
  }

  async function handleFileSelect(e) {
    try {
      setUploadError('')
      const files = await readFilesAsDataUrl(e.target.files, uploadCategory, uploadStage)
      setSelectedFiles(files)
    } catch (err) {
      setUploadError(err.message)
    }
  }

  async function handleCommentFileSelect(e) {
    try {
      setCommentError('')
      const files = await readFilesAsDataUrl(e.target.files, commentCategory, commentStage)
      setCommentFiles((prev) => [...prev, ...files])
    } catch (err) {
      setCommentError(err.message)
    }
  }

  async function submitUploadDocument(e) {
    e.preventDefault()
    if (!selectedFiles.length) {
      setUploadError('Por favor seleccioná al menos un archivo.')
      return
    }
    setUploading(true)
    setUploadError('')
    try {
      const enrichedFiles = selectedFiles.map((f) => ({
        ...f,
        category: uploadCategory,
        stage: uploadStage,
      }))
      await onUploadDocument({
        attachments: enrichedFiles,
        category: uploadCategory,
        stage: uploadStage,
        note: uploadNote.trim(),
      })
      setSelectedFiles([])
      setUploadNote('')
      setShowUploadModal(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setUploadError(err.message || 'No se pudieron subir los archivos.')
    } finally {
      setUploading(false)
    }
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!commentText.trim() && !commentFiles.length) return
    setSendingComment(true)
    setCommentError('')
    try {
      await onSendMessage({
        message: commentText.trim(),
        attachments: commentFiles,
        category: commentCategory,
        stage: commentStage,
        status: quote?.status,
      })
      setCommentText('')
      setCommentFiles([])
      if (commentFileRef.current) commentFileRef.current.value = ''
    } catch (err) {
      setCommentError(err.message || 'No se pudo enviar el comentario.')
    } finally {
      setSendingComment(false)
    }
  }

  const currentStatus = QUOTE_STATUS_INFO[quote?.status] || { label: quote?.status || 'En curso', color: '#131313', bg: '#f4f3ef' }

  return (
    <section className="quote-docs-timeline">
      {/* MODULE HEADER & TAB SWITCHER */}
      <header className="qdt-header">
        <div className="qdt-header-info">
          <span className="qdt-eyebrow">Gestión Técnica & Entregables</span>
          <h3 className="qdt-title">Expediente de Obra & Bitácora</h3>
          <p className="qdt-subtitle">
            Planos técnicos, vistas 3D, cotizaciones formales y seguimiento cronológico de la cotización.
          </p>
        </div>

        <div className="qdt-tabs" role="tablist">
          <button
            type="button"
            className={`qdt-tab-btn ${activeTab === 'documents' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('documents')}
            role="tab"
            aria-selected={activeTab === 'documents'}
          >
            📂 Documentación & Planos ({allDocuments.length})
          </button>
          <button
            type="button"
            className={`qdt-tab-btn ${activeTab === 'timeline' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('timeline')}
            role="tab"
            aria-selected={activeTab === 'timeline'}
          >
            💬 Bitácora & Comentarios ({messages.length})
          </button>
        </div>
      </header>

      {/* 1. VISTA DE DOCUMENTOS Y PLANOS */}
      {activeTab === 'documents' && (
        <div className="qdt-documents-view">
          {/* TOOLBAR: ACTION BUTTON + FILTERS */}
          <div className="qdt-toolbar">
            <button
              type="button"
              className="qdt-upload-btn"
              onClick={() => setShowUploadModal(true)}
            >
              ＋ Subir Archivo al Expediente
            </button>

            <div className="qdt-filters">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="qdt-select"
                aria-label="Filtrar por tipo de archivo"
              >
                <option value="all">🌟 Todos los tipos de archivo</option>
                {Object.entries(ATTACHMENT_CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>

              {/* Stage Filter */}
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="qdt-select"
                aria-label="Filtrar por etapa"
              >
                <option value="all">🏗️ Todas las etapas</option>
                {Object.entries(PROJECT_STAGES).map(([key, stg]) => (
                  <option key={key} value={key}>
                    {stg.label}
                  </option>
                ))}
              </select>

              {/* Search text */}
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre de plano o archivo…"
                className="qdt-search-input"
              />
            </div>
          </div>

          {/* DOCUMENTS GRID */}
          {filteredDocuments.length === 0 ? (
            <div className="qdt-empty-state">
              <span className="qdt-empty-icon">📁</span>
              <h4>No hay archivos en esta categoría o etapa</h4>
              <p>Podés cargar planos técnicos, presupuestos, renders o especificaciones para tener todo el legajo ordenado.</p>
              <button
                type="button"
                className="qdt-btn-secondary"
                onClick={() => setShowUploadModal(true)}
              >
                ＋ Subir el primer archivo
              </button>
            </div>
          ) : (
            <div className="qdt-docs-grid">
              {filteredDocuments.map((doc) => {
                const catInfo = ATTACHMENT_CATEGORIES[doc.category] || ATTACHMENT_CATEGORIES.general
                const stageInfo = PROJECT_STAGES[doc.stage] || { label: 'Etapa general', short: 'General' }
                const isImage = doc.name.match(/\.(png|jpe?g|webp|gif)$/i) && doc.url

                return (
                  <article key={doc.id} className="qdt-doc-card">
                    <div className="qdt-doc-card-top">
                      <div className="qdt-doc-icon-wrap">
                        {isImage ? (
                          <img src={doc.url} alt={doc.name} className="qdt-doc-thumb" />
                        ) : (
                          <span className="qdt-doc-emoji">{getFileIcon(doc.name)}</span>
                        )}
                      </div>
                      <div className="qdt-doc-badges">
                        <span className={`qdt-badge qdt-badge--${doc.category}`}>
                          {catInfo.icon} {catInfo.label}
                        </span>
                        <span className="qdt-badge qdt-badge--stage">
                          {stageInfo.short}
                        </span>
                      </div>
                    </div>

                    <div className="qdt-doc-info">
                      <h4 className="qdt-doc-name" title={doc.name}>
                        {doc.name}
                      </h4>
                      <p className="qdt-doc-meta">
                        📅 {formatDateTime(doc.uploadedAt)}
                      </p>
                      <p className="qdt-doc-author">
                        Subido por: <strong>{doc.authorRole === 'customer' ? 'Comitente / Estudio' : 'Ingeniería Óxida'}</strong>
                      </p>
                    </div>

                    <footer className="qdt-doc-actions">
                      <a
                        href={doc.url || doc.data}
                        target="_blank"
                        rel="noreferrer"
                        download={!doc.url ? doc.name : undefined}
                        className="qdt-download-link"
                      >
                        Descargar archivo ⬇
                      </a>
                    </footer>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. VISTA DE BITÁCORA Y COMENTARIOS */}
      {activeTab === 'timeline' && (
        <div className="qdt-timeline-view">
          <div className="qdt-status-banner" style={{ background: currentStatus.bg, borderColor: currentStatus.color }}>
            <span style={{ color: currentStatus.color }}>📌 Estado actual del legajo:</span>
            <strong style={{ color: currentStatus.color }}>{currentStatus.label}</strong>
          </div>

          {/* TIMELINE FEED */}
          <div className="qdt-timeline-feed">
            {messages.length === 0 ? (
              <div className="qdt-empty-state">
                <span className="qdt-empty-icon">💬</span>
                <h4>Sin notas ni comentarios registrados</h4>
                <p>Escribí el primer comentario técnico o consulta para que quede asentado con fecha y hora automática.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isCustomer = m.authorRole === 'customer'
                const isSystem = m.authorRole === 'system' || m.message.startsWith('📌') || m.message.startsWith('✅')
                const msgAtts = Array.isArray(m.attachments) ? m.attachments : []

                return (
                  <article
                    key={m.id}
                    className={`qdt-entry ${isSystem ? 'is-system' : isCustomer ? 'is-customer' : 'is-admin'}`}
                  >
                    <header className="qdt-entry-header">
                      <div className="qdt-author-tag">
                        <span className="qdt-author-avatar">
                          {isSystem ? '📌' : isCustomer ? '🏛️' : '🛠️'}
                        </span>
                        <strong>
                          {isSystem
                            ? 'Registro del Sistema'
                            : isCustomer
                            ? 'Estudio / Cliente'
                            : 'Ingeniería Óxida'}
                        </strong>
                      </div>

                      <time className="qdt-entry-time">
                        {formatDateTime(m.createdAt)}
                      </time>
                    </header>

                    <div className="qdt-entry-body">
                      <p>{m.message}</p>
                    </div>

                    {msgAtts.length > 0 && (
                      <div className="qdt-entry-attachments">
                        <span className="qdt-entry-att-title">Archivos adjuntos:</span>
                        <div className="qdt-entry-att-list">
                          {msgAtts.map((att, attIdx) => {
                            const cat = ATTACHMENT_CATEGORIES[att.category] || ATTACHMENT_CATEGORIES.general
                            return (
                              <a
                                key={attIdx}
                                href={att.url || att.data}
                                target="_blank"
                                rel="noreferrer"
                                download={!att.url ? att.name : undefined}
                                className="qdt-att-pill"
                              >
                                <span>{cat.icon}</span>
                                <strong>{att.name}</strong>
                                <small>⬇</small>
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </div>

          {/* FORM TO ADD COMMENT / ENTRY WITH AUTOMATIC DATE/TIME */}
          <form className="qdt-comment-form" onSubmit={submitComment}>
            <div className="qdt-comment-form-header">
              <span>Nueva nota / comunicación en la bitácora</span>
              <small>Quedará registrada automáticamente con fecha, hora ({new Date().toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })} hs) y estado actual.</small>
            </div>

            {commentError && <p className="qdt-error">{commentError}</p>}

            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribí observaciones técnicas, aclaraciones sobre planos o modificaciones de obra…"
              rows="3"
              className="qdt-textarea"
            />

            {/* Comment Attachments preview */}
            {commentFiles.length > 0 && (
              <div className="qdt-pending-files">
                {commentFiles.map((f, i) => (
                  <span key={i} className="qdt-file-chip">
                    📎 {f.name} ({ATTACHMENT_CATEGORIES[f.category]?.label || 'General'})
                    <button
                      type="button"
                      onClick={() => setCommentFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="qdt-comment-form-footer">
              <div className="qdt-comment-options">
                <label className="qdt-attach-trigger">
                  <input
                    type="file"
                    ref={commentFileRef}
                    onChange={handleCommentFileSelect}
                    multiple
                    accept=".pdf,.dwg,.dxf,.cad,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                    style={{ display: 'none' }}
                  />
                  📎 Adjuntar archivos
                </label>

                <select
                  value={commentCategory}
                  onChange={(e) => setCommentCategory(e.target.value)}
                  className="qdt-select-sm"
                  title="Tipo de archivo a adjuntar"
                >
                  <option value="planos">📐 Categoría: Planos</option>
                  <option value="cotizacion">💰 Categoría: Cotización</option>
                  <option value="vistas">🖼️ Categoría: Vistas 3D</option>
                  <option value="especificaciones">📑 Categoría: Memorias</option>
                  <option value="general">📎 Categoría: General</option>
                </select>

                <select
                  value={commentStage}
                  onChange={(e) => setCommentStage(e.target.value)}
                  className="qdt-select-sm"
                  title="Etapa de obra vinculada"
                >
                  <option value="relevamiento">Etapa 1 · Relevamiento</option>
                  <option value="anteproyecto">Etapa 2 · Anteproyecto</option>
                  <option value="cotizacion">Etapa 3 · Cotización</option>
                  <option value="aprobacion">Etapa 4 · Aprobación</option>
                  <option value="fabricacion">Etapa 5 · Fabricación</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={sendingComment || (!commentText.trim() && !commentFiles.length)}
                className="qdt-submit-btn"
              >
                {sendingComment ? 'Registrando…' : 'Registrar Comentario ↗'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL PARA SUBIR DOCUMENTOS FORMALES AL EXPEDIENTE */}
      {showUploadModal && (
        <div className="qdt-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="qdt-modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="qdt-modal-header">
              <div>
                <span className="qdt-eyebrow">Documentación Técnica</span>
                <h3>Cargar Archivo al Expediente de Obra</h3>
              </div>
              <button
                type="button"
                className="qdt-modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </header>

            {uploadError && <p className="qdt-error">{uploadError}</p>}

            <form onSubmit={submitUploadDocument} className="qdt-modal-form">
              <div className="qdt-form-row">
                <label>
                  <span>1. Tipo de Documento *</span>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    required
                  >
                    {Object.entries(ATTACHMENT_CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>
                        {cat.icon} {cat.label} ({cat.desc})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="qdt-form-row">
                <label>
                  <span>2. Etapa del Proyecto *</span>
                  <select
                    value={uploadStage}
                    onChange={(e) => setUploadStage(e.target.value)}
                    required
                  >
                    {Object.entries(PROJECT_STAGES).map(([key, stg]) => (
                      <option key={key} value={key}>
                        {stg.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="qdt-form-row">
                <label>
                  <span>3. Seleccionar archivo(s) * (CAD, DWG, PDF, Renders, Excel)</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    required
                    accept=".pdf,.dwg,.dxf,.cad,.rvt,.ifc,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                    className="qdt-file-input"
                  />
                </label>
                {selectedFiles.length > 0 && (
                  <ul className="qdt-selected-list">
                    {selectedFiles.map((f, i) => (
                      <li key={i}>
                        {getFileIcon(f.name)} <strong>{f.name}</strong> ({(f.size / 1024 / 1024).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="qdt-form-row">
                <label>
                  <span>4. Descripción / Notas de la versión (opcional)</span>
                  <textarea
                    value={uploadNote}
                    onChange={(e) => setUploadNote(e.target.value)}
                    placeholder="Ej: Plano acotado con corrección de baranda en escalera, versión aprobada..."
                    rows="2"
                  />
                </label>
              </div>

              <div className="qdt-modal-actions">
                <button
                  type="button"
                  className="qdt-btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFiles.length}
                  className="qdt-submit-btn"
                >
                  {uploading ? 'Procesando y Guardando…' : 'Subir Archivo al Expediente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
