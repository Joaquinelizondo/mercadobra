import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listParametricTemplates, getParametricTemplate, saveParametricTemplate, calculateDynamicTemplate, getAdminCostVariables } from '../lib/api'
import OxidaWordmark from '../components/OxidaWordmark'
import './AdminTemplates.css'

export default function AdminTemplates() {
  const { adminUser, adminToken } = useAuth()
  const [templates, setTemplates] = useState([])
  const [variables, setVariables] = useState([])
  const [editing, setEditing] = useState(null)
  
  const [testResult, setTestResult] = useState(null)
  const [testInputs, setTestInputs] = useState({})
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (!adminToken) return
    Promise.all([
      listParametricTemplates(adminToken),
      getAdminCostVariables(adminToken)
    ])
    .then(([tRes, vRes]) => {
      setTemplates(tRes.templates || [])
      setVariables(vRes.rows || [])
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
  }, [adminToken])

  if (!adminUser || !adminToken) return <Navigate to="/admin/login?redirect=/admin/plantillas" replace />

  const handleCreate = () => {
    setEditing({
      code: 'NUEVO_PRODUCTO',
      name: 'Nuevo Producto',
      description: '',
      inputs: [],
      lines: []
    })
    setTestResult(null)
  }

  const handleEdit = async (code) => {
    setLoading(true)
    try {
      const res = await getParametricTemplate(code, adminToken)
      setEditing({
        code: res.template.code,
        name: res.template.name,
        description: res.template.description,
        inputs: res.inputs,
        lines: res.lines
      })
      const defaultTestInputs = {}
      res.inputs.forEach(i => defaultTestInputs[i.code] = i.default_value)
      setTestInputs(defaultTestInputs)
      setTestResult(null)
    } catch(err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveMessage('')
    setError('')
    try {
      await saveParametricTemplate(editing, adminToken)
      setSaveMessage('¡Plantilla guardada correctamente!')
      const res = await listParametricTemplates(adminToken)
      setTemplates(res.templates || [])
    } catch (err) {
      setError(err.message)
    }
  }

  const handleTest = async () => {
    setError('')
    try {
      const res = await calculateDynamicTemplate(editing.code, testInputs, adminToken)
      setTestResult(res)
    } catch (err) {
      setError('Error en fórmula: ' + err.message)
    }
  }

  const addInput = () => setEditing(prev => ({ ...prev, inputs: [...prev.inputs, { code: 'var1', label: 'Variable', input_type: 'number', default_value: '1' }] }))
  const addLine = () => setEditing(prev => ({ ...prev, lines: [...prev.lines, { variable_code: '', quantity_formula: '1' }] }))

  const updateInput = (index, field, value) => {
    const newInputs = [...editing.inputs]
    newInputs[index][field] = value
    setEditing({ ...editing, inputs: newInputs })
  }
  const updateLine = (index, field, value) => {
    const newLines = [...editing.lines]
    newLines[index][field] = value
    setEditing({ ...editing, lines: newLines })
  }

  if (editing) {
    return (
      <section className="templates-page">
        <header>
          <div>
            <span>Constructor Visual</span>
            <h1>{editing.name}</h1>
          </div>
          <nav>
            <button onClick={() => setEditing(null)}>← Volver</button>
          </nav>
        </header>

        {error && <p className="error">{error}</p>}
        {saveMessage && <p className="success">{saveMessage}</p>}

        <div className="builder-grid">
          <form onSubmit={handleSave} className="builder-form">
            <fieldset>
              <legend>Propiedades Generales</legend>
              <label>Código <input value={editing.code} onChange={e => setEditing({...editing, code: e.target.value})} required /></label>
              <label>Nombre <input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} required /></label>
              <label>Descripción <textarea value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} /></label>
            </fieldset>

            <fieldset>
              <legend>Variables de Entrada (Preguntas al usuario)</legend>
              {editing.inputs.map((inp, idx) => (
                <div key={idx} className="builder-row">
                  <input placeholder="code (ej: width)" value={inp.code} onChange={e => updateInput(idx, 'code', e.target.value)} required />
                  <input placeholder="Label (ej: Ancho)" value={inp.label} onChange={e => updateInput(idx, 'label', e.target.value)} required />
                  <input placeholder="Default" value={inp.default_value} onChange={e => updateInput(idx, 'default_value', e.target.value)} required />
                  <button type="button" onClick={() => setEditing({...editing, inputs: editing.inputs.filter((_, i) => i !== idx)})}>X</button>
                </div>
              ))}
              <button type="button" onClick={addInput}>+ Agregar Variable</button>
            </fieldset>

            <fieldset>
              <legend>Fórmulas y Lista de Materiales</legend>
              {editing.lines.map((line, idx) => (
                <div key={idx} className="builder-row">
                  <select value={line.variable_code} onChange={e => updateLine(idx, 'variable_code', e.target.value)} required>
                    <option value="">Seleccionar costo base...</option>
                    {variables.map(v => <option key={v.code} value={v.code}>{v.description} ({v.code})</option>)}
                  </select>
                  <input placeholder="Fórmula cantidad (ej: width * 2)" value={line.quantity_formula} onChange={e => updateLine(idx, 'quantity_formula', e.target.value)} required />
                  <input placeholder="Desperdicio (ej: 0.1)" value={line.waste_formula || ''} onChange={e => updateLine(idx, 'waste_formula', e.target.value)} />
                  <button type="button" onClick={() => setEditing({...editing, lines: editing.lines.filter((_, i) => i !== idx)})}>X</button>
                </div>
              ))}
              <button type="button" onClick={addLine}>+ Agregar Fórmula</button>
            </fieldset>

            <button type="submit" className="save-btn">💾 Guardar Plantilla</button>
          </form>

          <aside className="builder-test">
            <h3>Simulador en Vivo</h3>
            <p>Ingresá valores de prueba para verificar tus fórmulas:</p>
            {editing.inputs.map((inp, idx) => (
              <label key={idx}>{inp.label} <input value={testInputs[inp.code] || ''} onChange={e => setTestInputs({...testInputs, [inp.code]: e.target.value})} /></label>
            ))}
            <button type="button" onClick={handleTest}>Probar Fórmulas</button>

            {testResult && (
              <div className="test-result">
                <h4>Costo Directo: ${testResult.totals.directCostUyu} UYU</h4>
                <h4>Precio Venta: ${testResult.totals.priceFinalUsd} USD</h4>
                <div style={{fontSize: '0.8rem', marginTop: '1rem'}}>
                  {testResult.lines.map((l, i) => <div key={i}>- {l.description}: {l.quantity.toFixed(2)} {l.unit}</div>)}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    )
  }

  return (
    <section className="templates-page">
      <header>
        <div>
          <span>Motor Paramétrico</span>
          <h1>Plantillas de Productos</h1>
        </div>
        <nav>
          <Link to="/admin/analitica">Analítica</Link>
          <Link to="/admin/cotiza">Cotizador B2B</Link>
        </nav>
      </header>

      {error && <p className="error">{error}</p>}
      
      <div className="templates-toolbar">
        <button onClick={handleCreate} className="create-btn">+ Crear Nuevo Producto</button>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className="templates-grid">
          {templates.map(t => (
            <article key={t.id} className="template-card">
              <h2>{t.name}</h2>
              <code>{t.code}</code>
              <p>{t.description}</p>
              <button onClick={() => handleEdit(t.code)}>Editar Reglas →</button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
