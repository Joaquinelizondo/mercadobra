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
        <header className="templates-header">
          <div className="templates-brand"><OxidaWordmark /><span>OXI Modela</span></div>
          <nav>
            <button onClick={() => setEditing(null)}>← Volver al Listado</button>
          </nav>
        </header>

        <div className="templates-intro">
          <div>
            <span>Constructor Visual</span>
            <h1>{editing.name}</h1>
            <p>Editá las reglas paramétricas de este producto. Todo lo que cambies acá afectará al cotizador B2B instantáneamente.</p>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {saveMessage && <div className="success">{saveMessage}</div>}

        <div className="builder-layout">
          <form onSubmit={handleSave} className="builder-form">
            <fieldset>
              <legend>Propiedades Generales</legend>
              <label><span>Código Único</span> <input value={editing.code} onChange={e => setEditing({...editing, code: e.target.value})} required /></label>
              <label><span>Nombre del Producto</span> <input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} required /></label>
              <label><span>Descripción Pública</span> <textarea value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} /></label>
            </fieldset>

            <fieldset>
              <legend>Variables de Entrada (Formulario B2B)</legend>
              {editing.inputs.length === 0 && <p style={{fontSize: '0.8rem', color: '#81786e', marginBottom: '1rem'}}>No has agregado preguntas para el usuario. Por ejemplo: ancho, largo, espesor.</p>}
              {editing.inputs.map((inp, idx) => (
                <div key={idx} className="builder-row">
                  <input placeholder="código (ej: ancho)" value={inp.code} onChange={e => updateInput(idx, 'code', e.target.value)} required />
                  <input placeholder="Etiqueta Visual (ej: Ancho en metros)" value={inp.label} onChange={e => updateInput(idx, 'label', e.target.value)} required />
                  <input placeholder="Valor defecto" value={inp.default_value} onChange={e => updateInput(idx, 'default_value', e.target.value)} required />
                  <button type="button" className="remove-btn" onClick={() => setEditing({...editing, inputs: editing.inputs.filter((_, i) => i !== idx)})}>X</button>
                </div>
              ))}
              <button type="button" onClick={addInput}>+ Agregar Pregunta</button>
            </fieldset>

            <fieldset>
              <legend>Lista de Materiales & Fórmulas Matemáticas</legend>
              {editing.lines.length === 0 && <p style={{fontSize: '0.8rem', color: '#81786e', marginBottom: '1rem'}}>No has agregado ninguna regla de costo. Ej: Horas de Oficial = (ancho + largo) * 2</p>}
              {editing.lines.map((line, idx) => (
                <div key={idx} className="builder-row">
                  <select value={line.variable_code} onChange={e => updateLine(idx, 'variable_code', e.target.value)} required>
                    <option value="">Seleccionar costo base...</option>
                    {variables.map(v => <option key={v.code} value={v.code}>{v.description} ({v.code})</option>)}
                  </select>
                  <input placeholder="Fórmula (ej: ancho * largo * 2)" value={line.quantity_formula} onChange={e => updateLine(idx, 'quantity_formula', e.target.value)} required />
                  <input placeholder="Desperdicio (ej: 0.1 para 10%)" value={line.waste_formula || ''} onChange={e => updateLine(idx, 'waste_formula', e.target.value)} />
                  <button type="button" className="remove-btn" onClick={() => setEditing({...editing, lines: editing.lines.filter((_, i) => i !== idx)})}>X</button>
                </div>
              ))}
              <button type="button" onClick={addLine}>+ Agregar Regla de Costo</button>
            </fieldset>

            <button type="submit" className="save-btn">GUARDAR CAMBIOS EN PRODUCCIÓN</button>
          </form>

          <aside className="builder-test">
            <h3>Simulador en Vivo</h3>
            <p>Cargá valores de prueba y verificá si las fórmulas dan el número que esperabas.</p>
            {editing.inputs.map((inp, idx) => (
              <label key={idx}><span>{inp.label}</span> <input value={testInputs[inp.code] || ''} onChange={e => setTestInputs({...testInputs, [inp.code]: e.target.value})} /></label>
            ))}
            <button type="button" className="test-btn" onClick={handleTest}>CALCULAR SIMULACIÓN</button>

            {testResult && (
              <div className="test-result">
                <div className="totals-highlight">
                  <h4>Costo: ${testResult.totals.directCostUyu} UYU</h4>
                  <h4>Venta: ${testResult.totals.priceFinalUsd} USD</h4>
                </div>
                <div style={{fontSize: '0.75rem', color: '#675f56'}}>
                  <strong style={{display: 'block', marginBottom: '8px', color: '#a8522e'}}>DESGLOSE DE FÓRMULAS:</strong>
                  {testResult.lines.map((l, i) => (
                    <div key={i} style={{padding: '4px 0', borderBottom: '1px solid #e1dad0'}}>
                      - {l.description}: <strong>{l.quantity.toFixed(2)} {l.unit}</strong>
                    </div>
                  ))}
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
      <header className="templates-header">
        <div className="templates-brand"><OxidaWordmark /><span>OXI Quote</span></div>
        <nav>
          <Link to="/admin/analitica">Analítica</Link>
          <Link to="/admin/cotiza">Cotizador B2B</Link>
        </nav>
      </header>

      <div className="templates-intro">
        <div>
          <span>Motor Paramétrico</span>
          <h1>Plantillas de Productos</h1>
          <p>Configurá cómo la aplicación debe cotizar cada producto de forma dinámica enseñándole tus fórmulas y consumos.</p>
        </div>
        <button onClick={handleCreate} className="create-btn">Crear Nuevo Producto</button>
      </div>

      {error && <div className="error">{error}</div>}
      
      {loading ? <p>Cargando plantillas...</p> : (
        <div className="templates-grid">
          {templates.map(t => (
            <article key={t.id} className="template-card">
              <h2>{t.name}</h2>
              <code>{t.code}</code>
              <p>{t.description || 'Sin descripción'}</p>
              <button onClick={() => handleEdit(t.code)}>Editar Reglas →</button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
