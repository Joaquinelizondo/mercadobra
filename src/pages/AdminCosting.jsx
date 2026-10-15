import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import OxidaWordmark from '../components/OxidaWordmark'
import { useAuth } from '../context/AuthContext'
import { calculateTemplate, getAdminCostVariables, auditQuoteWithAI, downloadCostingPdf, convertCostingToQuote, getAdminCustomers } from '../lib/api'
import { formatPrice } from '../utils/format'
import './AdminCosting.css'

const INITIAL_FORM = { diameterM: 1.2, heightM: 0.75, widthM: 1.0, quantity: 1, exchangeRateUyuPerUsd: 40, includeFreight: true, freightTrips: 1 }
const number = (value, digits = 2) => new Intl.NumberFormat('es-UY', { maximumFractionDigits: digits }).format(Number(value || 0))

export default function AdminCosting() {
  const { adminUser, adminToken } = useAuth()
  const [templateCode, setTemplateCode] = useState('MESA_CIRCULAR_001')
  const [form, setForm] = useState(INITIAL_FORM)
  const [catalog, setCatalog] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState(null)
  const [auditError, setAuditError] = useState('')

  const [customers, setCustomers] = useState([])
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertForm, setConvertForm] = useState({ customerId: '', customTitle: '', notes: '' })
  const [isConverting, setIsConverting] = useState(false)
  const [convertError, setConvertError] = useState('')
  const [convertSuccess, setConvertSuccess] = useState(null)

  useEffect(() => {
    if (!adminToken) return
    getAdminCostVariables(adminToken).then((data) => setCatalog(data.rows || [])).catch((requestError) => setError(requestError.message))
    getAdminCustomers({}, adminToken).then((data) => setCustomers(data.rows || [])).catch(() => {})
  }, [adminToken])

  async function handleDownloadPdf() {
    if (!result) return
    setIsDownloadingPdf(true)
    setError('')
    try {
      await downloadCostingPdf({
        result: { ...result, form },
        customerName: 'Propuesta Comercial B2B',
        clientRef: `COT-${result.template?.code || 'PARAM'}`
      }, adminToken)
    } catch (err) {
      setError(err.message || 'Error al generar el PDF del presupuesto.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  async function handleConvertSubmit(e) {
    e.preventDefault()
    if (!convertForm.customerId) {
      setConvertError('Debes seleccionar un cliente.')
      return
    }
    setIsConverting(true)
    setConvertError('')
    try {
      const created = await convertCostingToQuote({
        customerId: Number(convertForm.customerId),
        result: { ...result, form },
        customTitle: convertForm.customTitle || result.template?.name || result.template?.code,
        notes: convertForm.notes
      }, adminToken)
      const selectedCustomer = customers.find((c) => c.id === Number(convertForm.customerId))
      setConvertSuccess({
        id: created.id,
        customerId: convertForm.customerId,
        referenceNumber: created.referenceNumber,
        customerName: selectedCustomer?.name || 'Cliente'
      })
      setShowConvertModal(false)
    } catch (err) {
      setConvertError(err.message || 'No se pudo convertir a cotización.')
    } finally {
      setIsConverting(false)
    }
  }

  const pendingReview = useMemo(() => catalog.filter((item) => item.reviewStatus === 'requiere_revision').length, [catalog])
  if (!adminUser || !adminToken) return <Navigate to="/admin/login?redirect=/admin/cotiza" replace />

  function change(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleTemplateChange(e) {
    setTemplateCode(e.target.value)
    setResult(null)
    setError('')
  }

  async function submit(event) {
    event.preventDefault(); setLoading(true); setError(''); setAuditResult(null); setAuditError('')
    try { setResult(await calculateTemplate(templateCode, form, adminToken)) }
    catch (requestError) { setError(requestError.message || 'No se pudo calcular la cotización.') }
    finally { setLoading(false) }
  }

  async function handleAudit() {
    if (!result) return
    setIsAuditing(true)
    setAuditError('')
    try {
      const res = await auditQuoteWithAI(result, adminToken)
      setAuditResult(res.audit)
    } catch (err) {
      setAuditError(err.message || 'No se pudo auditar la cotización.')
    } finally {
      setIsAuditing(false)
    }
  }

  return <section className="costing-page">
    <header className="costing-header">
      <div className="costing-brand"><OxidaWordmark /><span>OXI Quote</span></div>
      <nav><Link to="/admin/analitica">Analítica</Link><Link to="/admin/plantillas">Editor Paramétrico</Link><Link to="/admin/productos">Productos</Link><Link to="/admin/clientes">Clientes</Link><Link to="/admin/cotizaciones-clientes">Cotizaciones</Link><Link to="/admin/modelador">OXI Modela</Link></nav>
    </header>

    <div className="costing-intro">
      <div>
        <span>Motor paramétrico</span>
        <h1>Cotizador B2B</h1>
        <p>Calculá un precio trazable desde medidas, costos vigentes y reglas comerciales.</p>
      </div>
      <div className="costing-catalog-status"><strong>{catalog.length}</strong><span>variables vigentes</span><small>{pendingReview} requieren revisión técnica</small></div>
    </div>

    {error && <p className="costing-error" role="alert">{error}</p>}
    <div className="costing-layout">
      <form className="costing-form" onSubmit={submit}>
        <div className="costing-section-title"><span>01</span><div><h2>Familia / Producto</h2><p>Seleccioná qué elemento querés cotizar.</p></div></div>
        <div className="costing-fields">
          <label>
            <span>Familia</span>
            <select value={templateCode} onChange={handleTemplateChange}>
              <option value="MESA_CIRCULAR_001">Mesa Circular</option>
              <option value="OXI_DIVIDER_D01">OXI Divider D01 (Divisor de Ambientes)</option>
            </select>
          </label>
        </div>

        <div className="costing-section-title"><span>02</span><div><h2>Geometría</h2><p>Medidas terminadas del producto.</p></div></div>
        <div className="costing-fields">
          {templateCode === 'MESA_CIRCULAR_001' ? (
            <>
              <label><span>Diámetro (m)</span><input name="diameterM" type="number" min="0.5" max="3" step="0.01" value={form.diameterM} onChange={change} required /></label>
              <label><span>Altura (m)</span><input name="heightM" type="number" min="0.4" max="1.2" step="0.01" value={form.heightM} onChange={change} required /></label>
            </>
          ) : (
            <>
              <label><span>Ancho (m)</span><input name="widthM" type="number" min="0.3" max="5" step="0.01" value={form.widthM} onChange={change} required /></label>
              <label><span>Altura (m)</span><input name="heightM" type="number" min="0.5" max="3.5" step="0.01" value={form.heightM} onChange={change} required /></label>
            </>
          )}
          <label><span>Cantidad</span><input name="quantity" type="number" min="1" max="50" step="1" value={form.quantity} onChange={change} required /></label>
        </div>
        <div className="costing-section-title"><span>03</span><div><h2>Comercial</h2><p>Conversión y logística de la propuesta.</p></div></div>
        <div className="costing-fields">
          <label><span>Dólar BROU compra</span><input name="exchangeRateUyuPerUsd" type="number" min="1" step="0.01" value={form.exchangeRateUyuPerUsd} onChange={change} required /></label>
          <label className="costing-check"><input name="includeFreight" type="checkbox" checked={form.includeFreight} onChange={change} /><span>Incluir flete</span></label>
          {form.includeFreight && <label><span>Viajes</span><input name="freightTrips" type="number" min="1" max="20" step="1" value={form.freightTrips} onChange={change} required /></label>}
        </div>
        <button className="costing-submit" disabled={loading}>{loading ? 'Calculando…' : 'Calcular cotización'}</button>
        <p className="costing-note">El tipo de cambio debe confirmarse manualmente antes de enviar una propuesta.</p>
      </form>

      <div className="costing-result">
        {!result ? <div className="costing-empty"><span>OXI</span><h2>Prepará el primer cálculo</h2><p>Completá las medidas y calculá para ver cantidades, costos y precio comercial.</p></div> : <>
          <header><div><span>{result.template.code}</span><h2>Resultado comercial</h2></div><strong>{formatPrice(result.totals.priceFinalUsd, 'USD')}</strong></header>
          <div className="costing-metrics">
            {result.derived.areaTopM2 && <div><span>Área de tapa</span><strong>{number(result.derived.areaTopM2)} m²</strong></div>}
            {result.derived.tubeLengthM && <div><span>Tubo total</span><strong>{number(result.derived.tubeLengthM)} m</strong></div>}
            <div><span>Horas oficial</span><strong>{number(result.derived.workshopHours)} h</strong></div>
          </div>
          <div className="costing-table-wrap"><table><thead><tr><th>Recurso</th><th>Cantidad</th><th>Unitario</th><th>Subtotal</th></tr></thead><tbody>{result.lines.map((item) => <tr key={item.code}><td><strong>{item.code}</strong><span>{item.description}</span></td><td>{number(item.quantity)} {item.unit}</td><td>{formatPrice(item.unitCostUyu, 'UYU')}</td><td>{formatPrice(item.subtotalUyu, 'UYU')}</td></tr>)}</tbody></table></div>
          <div className="costing-totals"><div><span>Costo directo</span><strong>{formatPrice(result.totals.directCostUyu, 'UYU')}</strong></div><div><span>Gastos generales ({number(result.rates.overheadRate * 100, 1)}%)</span><strong>{formatPrice(result.totals.overheadUyu, 'UYU')}</strong></div><div><span>Precio antes de IVA</span><strong>{formatPrice(result.totals.priceBeforeTaxUsd, 'USD')}</strong></div><div><span>IVA ({number(result.rates.taxRate * 100, 1)}%)</span><strong>{formatPrice(result.totals.taxUsd, 'USD')}</strong></div><div className="is-total"><span>Total</span><strong>{formatPrice(result.totals.priceFinalUsd, 'USD')}</strong></div></div>
          <div className="costing-warnings"><h3>Supuestos a validar</h3>{result.assumptions.map((text) => <p key={text}>• {text}</p>)}</div>
          
          <div className="costing-ai-auditor" style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f5ef', border: '1px solid #dcd4c9', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ea580c' }}>🤖 OXI AI Auditor</h3>
              <button type="button" onClick={handleAudit} disabled={isAuditing} style={{ background: '#ea580c', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isAuditing ? '⏳ Auditando...' : '✨ Auditar Rentabilidad'}
              </button>
            </div>
            {auditError && <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>{auditError}</p>}
            {auditResult && (
              <div style={{ padding: '1rem', background: 'white', borderRadius: '4px', borderLeft: `4px solid ${auditResult.status === 'VERDE' ? '#16a34a' : auditResult.status === 'AMARILLO' ? '#eab308' : '#dc2626'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: auditResult.status === 'VERDE' ? '#16a34a' : auditResult.status === 'AMARILLO' ? '#ca8a04' : '#dc2626' }}>
                    {auditResult.status === 'VERDE' ? '✅ SANO' : auditResult.status === 'AMARILLO' ? '⚠️ RIESGO MEDIO' : '🚨 RIESGO ALTO'}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '500' }}>{auditResult.summary}</p>
                {auditResult.risks?.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#4a4a4a' }}>
                    {auditResult.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* COMMERCIAL EXPORT & ACTIONS */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '12px 20px',
                background: '#131313',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              📄 {isDownloadingPdf ? 'Generando PDF...' : 'Descargar Presupuesto PDF'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowConvertModal(true)
                setConvertSuccess(null)
                setConvertForm({
                  customerId: customers[0]?.id || '',
                  customTitle: result.template?.name || result.template?.code,
                  notes: ''
                })
              }}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '12px 20px',
                background: '#ea580c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              💼 Convertir en Cotización Oficial
            </button>
          </div>

          {convertSuccess && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '0.9rem' }}>
              ✓ Cotización creada exitosamente para <strong>{convertSuccess.customerName}</strong> (#{convertSuccess.referenceNumber}).
              <Link to={`/admin/clientes/${convertSuccess.customerId}/cotizaciones/${convertSuccess.id}`} style={{ marginLeft: '10px', color: '#047857', fontWeight: 'bold', textDecoration: 'underline' }}>
                Abrir Ficha de Cotización en OXI Studio →
              </Link>
            </div>
          )}
        </>}
      </div>
    </div>

    {/* MODAL DE CONVERSIÓN A COTIZACIÓN COMERCIAL */}
    {showConvertModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '10px', maxWidth: '500px', width: '100%', padding: '1.75rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>OXI QUOTE</span>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#131313' }}>Convertir en Cotización Oficial</h3>
            </div>
            <button type="button" onClick={() => setShowConvertModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>×</button>
          </div>

          {convertError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '10px' }}>{convertError}</p>}

          <form onSubmit={handleConvertSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600 }}>Asociar a Cliente</span>
              <select
                value={convertForm.customerId}
                onChange={(e) => setConvertForm({ ...convertForm, customerId: e.target.value })}
                required
                style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Seleccioná un cliente...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ''} · {c.email}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600 }}>Título de la Propuesta</span>
              <input
                type="text"
                value={convertForm.customTitle}
                onChange={(e) => setConvertForm({ ...convertForm, customTitle: e.target.value })}
                required
                style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </label>

            <div style={{ background: '#f9f8f6', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>Monto total (USD):</span>
                <strong style={{ color: '#131313' }}>{formatPrice(result.totals.priceFinalUsd, 'USD')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Líneas de insumos calculadas:</span>
                <strong>{result.lines?.length || 0} ítems</strong>
              </div>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600 }}>Notas internas o condiciones de obra</span>
              <textarea
                rows="3"
                value={convertForm.notes}
                onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })}
                placeholder="Observaciones de sitio o logística..."
                style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                style={{ padding: '8px 14px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isConverting}
                style={{ padding: '8px 16px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
              >
                {isConverting ? 'Creando...' : 'Crear Cotización en OXI Studio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </section>
}
