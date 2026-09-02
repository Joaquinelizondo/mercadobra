import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import OxidaWordmark from '../components/OxidaWordmark'
import { useAuth } from '../context/AuthContext'
import { calculateCircularTable, getAdminCostVariables } from '../lib/api'
import { formatPrice } from '../utils/format'
import './AdminCosting.css'

const INITIAL_FORM = { diameterM: 1.2, heightM: 0.75, quantity: 1, exchangeRateUyuPerUsd: 40, includeFreight: true, freightTrips: 1 }
const number = (value, digits = 2) => new Intl.NumberFormat('es-UY', { maximumFractionDigits: digits }).format(Number(value || 0))

export default function AdminCosting() {
  const { adminUser, adminToken } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [catalog, setCatalog] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!adminToken) return
    getAdminCostVariables(adminToken).then((data) => setCatalog(data.rows || [])).catch((requestError) => setError(requestError.message))
  }, [adminToken])

  const pendingReview = useMemo(() => catalog.filter((item) => item.reviewStatus === 'requiere_revision').length, [catalog])
  if (!adminUser || !adminToken) return <Navigate to="/admin/login?redirect=/admin/cotiza" replace />

  function change(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('')
    try { setResult(await calculateCircularTable(form, adminToken)) }
    catch (requestError) { setError(requestError.message || 'No se pudo calcular la cotización.') }
    finally { setLoading(false) }
  }

  return <section className="costing-page">
    <header className="costing-header">
      <div className="costing-brand"><OxidaWordmark /><span>OXI Cotiza · Piloto</span></div>
      <nav><Link to="/admin/productos">Productos</Link><Link to="/admin/clientes">Clientes</Link><Link to="/admin/cotizaciones-clientes">Cotizaciones</Link><Link to="/admin/modelador">OXI Modela</Link></nav>
    </header>

    <div className="costing-intro">
      <div><span>Motor paramétrico</span><h1>Mesa circular</h1><p>Calculá un precio trazable desde medidas, costos vigentes y reglas comerciales.</p></div>
      <div className="costing-catalog-status"><strong>{catalog.length}</strong><span>variables vigentes</span><small>{pendingReview} requieren revisión técnica</small></div>
    </div>

    {error && <p className="costing-error" role="alert">{error}</p>}
    <div className="costing-layout">
      <form className="costing-form" onSubmit={submit}>
        <div className="costing-section-title"><span>01</span><div><h2>Geometría</h2><p>Medidas terminadas del producto.</p></div></div>
        <div className="costing-fields">
          <label><span>Diámetro (m)</span><input name="diameterM" type="number" min="0.5" max="3" step="0.01" value={form.diameterM} onChange={change} required /></label>
          <label><span>Altura (m)</span><input name="heightM" type="number" min="0.4" max="1.2" step="0.01" value={form.heightM} onChange={change} required /></label>
          <label><span>Cantidad</span><input name="quantity" type="number" min="1" max="50" step="1" value={form.quantity} onChange={change} required /></label>
        </div>
        <div className="costing-section-title"><span>02</span><div><h2>Comercial</h2><p>Conversión y logística de la propuesta.</p></div></div>
        <div className="costing-fields">
          <label><span>Dólar BROU compra</span><input name="exchangeRateUyuPerUsd" type="number" min="1" step="0.01" value={form.exchangeRateUyuPerUsd} onChange={change} required /></label>
          <label className="costing-check"><input name="includeFreight" type="checkbox" checked={form.includeFreight} onChange={change} /><span>Incluir flete</span></label>
          {form.includeFreight && <label><span>Viajes</span><input name="freightTrips" type="number" min="1" max="20" step="1" value={form.freightTrips} onChange={change} required /></label>}
        </div>
        <button className="costing-submit" disabled={loading || !catalog.length}>{loading ? 'Calculando…' : 'Calcular cotización'}</button>
        <p className="costing-note">El tipo de cambio debe confirmarse manualmente antes de enviar una propuesta.</p>
      </form>

      <div className="costing-result">
        {!result ? <div className="costing-empty"><span>OXI</span><h2>Prepará el primer cálculo</h2><p>Completá las medidas y calculá para ver cantidades, costos y precio comercial.</p></div> : <>
          <header><div><span>{result.template.code}</span><h2>Resultado comercial</h2></div><strong>{formatPrice(result.totals.priceFinalUsd, 'USD')}</strong></header>
          <div className="costing-metrics"><div><span>Área de tapa</span><strong>{number(result.derived.areaTopM2)} m²</strong></div><div><span>Tubo total</span><strong>{number(result.derived.tubeLengthM)} m</strong></div><div><span>Horas oficial</span><strong>{number(result.derived.workshopHours)} h</strong></div></div>
          <div className="costing-table-wrap"><table><thead><tr><th>Recurso</th><th>Cantidad</th><th>Unitario</th><th>Subtotal</th></tr></thead><tbody>{result.lines.map((item) => <tr key={item.code}><td><strong>{item.code}</strong><span>{item.description}</span></td><td>{number(item.quantity)} {item.unit}</td><td>{formatPrice(item.unitCostUyu, 'UYU')}</td><td>{formatPrice(item.subtotalUyu, 'UYU')}</td></tr>)}</tbody></table></div>
          <div className="costing-totals"><div><span>Costo directo</span><strong>{formatPrice(result.totals.directCostUyu, 'UYU')}</strong></div><div><span>Gastos generales ({number(result.rates.overheadRate * 100, 1)}%)</span><strong>{formatPrice(result.totals.overheadUyu, 'UYU')}</strong></div><div><span>Precio antes de IVA</span><strong>{formatPrice(result.totals.priceBeforeTaxUsd, 'USD')}</strong></div><div><span>IVA ({number(result.rates.taxRate * 100, 1)}%)</span><strong>{formatPrice(result.totals.taxUsd, 'USD')}</strong></div><div className="is-total"><span>Total</span><strong>{formatPrice(result.totals.priceFinalUsd, 'USD')}</strong></div></div>
          <div className="costing-warnings"><h3>Supuestos a validar</h3>{result.assumptions.map((text) => <p key={text}>• {text}</p>)}</div>
        </>}
      </div>
    </div>
  </section>
}
