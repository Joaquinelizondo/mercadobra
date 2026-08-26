import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OxidaWordmark from '../components/OxidaWordmark'
import { getAdminModelerProject, saveAdminModelerProject } from '../lib/api'
import './AdminModeler.css'

const STORAGE_KEY = 'mercadobra-modeler-private-beta'
const GRID_SIZE = 0.5
const DEFAULT_SETTINGS = { height: 2.7, thickness: 0.15 }

function snap(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function loadProject() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved?.walls) ? saved.walls : []
  } catch {
    return []
  }
}

function wallLength(wall) {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}

export default function AdminModeler() {
  const { adminUser, adminToken, logoutAdmin } = useAuth()
  const canvasRef = useRef(null)
  const [walls, setWalls] = useState(loadProject)
  const [history, setHistory] = useState([])
  const [draftStart, setDraftStart] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [tool, setTool] = useState('wall')
  const [view, setView] = useState('3d')
  const [zoom, setZoom] = useState(34)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saveState, setSaveState] = useState('Cargando proyecto…')
  const [projectName, setProjectName] = useState('Proyecto sin nombre')
  const [projectVersion, setProjectVersion] = useState(null)
  const [viewportRevision, setViewportRevision] = useState(0)

  const selectedWall = walls.find((wall) => wall.id === selectedId)
  const totalLength = useMemo(() => walls.reduce((sum, wall) => sum + wallLength(wall), 0), [walls])

  useEffect(() => {
    if (!adminToken || adminUser?.role !== 'admin') return
    let active = true
    getAdminModelerProject(adminToken)
      .then(({ project }) => {
        if (!active) return
        if (project) {
          setWalls(Array.isArray(project.model?.walls) ? project.model.walls : [])
          setProjectName(project.name || 'Proyecto sin nombre')
          setProjectVersion(project.version)
          setSaveState(`Versión ${project.version} cargada`)
        } else setSaveState('Proyecto nuevo')
      })
      .catch((error) => { if (active) setSaveState(`Sin conexión: ${error.message}`) })
    return () => { active = false }
  }, [adminToken, adminUser?.role])

  const project = useCallback((point, z = 0) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const cx = canvas.clientWidth / 2
    const cy = canvas.clientHeight / 2 + 80
    if (view === 'top') {
      return { x: cx + point.x * zoom, y: cy - point.y * zoom }
    }
    return {
      x: cx + (point.x - point.y) * zoom * 0.82,
      y: cy + (point.x + point.y) * zoom * 0.38 - z * zoom,
    }
  }, [view, zoom])

  const unproject = useCallback((screenX, screenY) => {
    const canvas = canvasRef.current
    const cx = canvas.clientWidth / 2
    const cy = canvas.clientHeight / 2 + 80
    if (view === 'top') {
      return { x: snap((screenX - cx) / zoom), y: snap((cy - screenY) / zoom) }
    }
    const a = (screenX - cx) / (zoom * 0.82)
    const b = (screenY - cy) / (zoom * 0.38)
    return { x: snap((a + b) / 2), y: snap((b - a) / 2) }
  }, [view, zoom])

  useEffect(() => {
    const cancelDraft = (event) => {
      if (event.key === 'Escape') setDraftStart(null)
    }
    window.addEventListener('keydown', cancelDraft)
    return () => window.removeEventListener('keydown', cancelDraft)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas.parentElement
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      canvas.width = parent.clientWidth * ratio
      canvas.height = parent.clientHeight * ratio
      canvas.style.width = `${parent.clientWidth}px`
      canvas.style.height = `${parent.clientHeight}px`
      setViewportRevision((value) => value + 1)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const ratio = window.devicePixelRatio || 1
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const width = canvas.width / ratio
    const height = canvas.height / ratio
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ebe7df'
    ctx.fillRect(0, 0, width, height)

    ctx.lineWidth = 1
    for (let n = -20; n <= 20; n += 1) {
      const xLineA = project({ x: n, y: -20 })
      const xLineB = project({ x: n, y: 20 })
      const yLineA = project({ x: -20, y: n })
      const yLineB = project({ x: 20, y: n })
      ctx.strokeStyle = n === 0 ? '#b86542' : '#d7d1c7'
      ctx.beginPath(); ctx.moveTo(xLineA.x, xLineA.y); ctx.lineTo(xLineB.x, xLineB.y); ctx.stroke()
      ctx.strokeStyle = n === 0 ? '#596c66' : '#d7d1c7'
      ctx.beginPath(); ctx.moveTo(yLineA.x, yLineA.y); ctx.lineTo(yLineB.x, yLineB.y); ctx.stroke()
    }

    walls.forEach((wall) => {
      const start = project(wall.start)
      const end = project(wall.end)
      const topStart = project(wall.start, wall.height)
      const topEnd = project(wall.end, wall.height)
      const isSelected = wall.id === selectedId
      if (view === '3d') {
        ctx.fillStyle = isSelected ? '#c97752' : '#f7f3ea'
        ctx.strokeStyle = isSelected ? '#8f4127' : '#5f5b54'
        ctx.lineWidth = isSelected ? 2 : 1
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.lineTo(topEnd.x, topEnd.y)
        ctx.lineTo(topStart.x, topStart.y)
        ctx.closePath(); ctx.fill(); ctx.stroke()
      } else {
        ctx.strokeStyle = isSelected ? '#b85e39' : '#34332f'
        ctx.lineWidth = Math.max(4, wall.thickness * zoom)
        ctx.lineCap = 'square'
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke()
      }
    })

    if (draftStart && cursor) {
      const start = project(draftStart)
      const end = project(cursor)
      ctx.setLineDash([7, 6]); ctx.strokeStyle = '#b85e39'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke(); ctx.setLineDash([])
    }
  }, [walls, selectedId, draftStart, cursor, project, view, zoom, viewportRevision])

  if (!adminUser || !adminToken || adminUser.role !== 'admin') {
    return <Navigate to="/admin/login?redirect=/admin/modelador" replace />
  }

  function canvasPoint(event) {
    const rect = canvasRef.current.getBoundingClientRect()
    return unproject(event.clientX - rect.left, event.clientY - rect.top)
  }

  function handleCanvasClick(event) {
    const rect = canvasRef.current.getBoundingClientRect()
    const screenPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    if (tool === 'select') {
      const closest = walls
        .map((wall) => ({ wall, distance: distanceToSegment(screenPoint, project(wall.start), project(wall.end)) }))
        .sort((a, b) => a.distance - b.distance)[0]
      setSelectedId(closest?.distance <= 14 ? closest.wall.id : null)
      return
    }
    const point = canvasPoint(event)
    if (!draftStart) {
      setDraftStart(point)
      return
    }
    if (point.x === draftStart.x && point.y === draftStart.y) return
    setHistory((items) => [...items, walls])
    setWalls((items) => [...items, {
      id: crypto.randomUUID(), start: draftStart, end: point,
      height: Number(settings.height), thickness: Number(settings.thickness),
    }])
    setDraftStart(point)
    setSaveState('Cambios sin guardar')
  }

  function undo() {
    if (!history.length) return
    setWalls(history[history.length - 1])
    setHistory((items) => items.slice(0, -1))
    setDraftStart(null)
    setSaveState('Cambios sin guardar')
  }

  async function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ walls, updatedAt: new Date().toISOString() }))
    setSaveState('Guardando…')
    try {
      const { project } = await saveAdminModelerProject({ name: projectName, model: { walls } }, adminToken)
      setProjectVersion(project.version)
      setSaveState(`Guardado · versión ${project.version}`)
    } catch (error) {
      setSaveState(`Guardado local · ${error.message}`)
    }
  }

  function deleteSelected() {
    if (!selectedId) return
    setHistory((items) => [...items, walls])
    setWalls((items) => items.filter((wall) => wall.id !== selectedId))
    setSelectedId(null)
    setSaveState('Cambios sin guardar')
  }

  return (
    <section className="modeler-page">
      <header className="modeler-header">
        <div className="modeler-brand"><OxidaWordmark /><span>MercadoBRA Modelador</span><em>Beta privada</em></div>
        <nav>
          <Link to="/admin/productos">Productos</Link>
          <Link to="/admin/clientes">Clientes</Link>
          <button type="button" onClick={logoutAdmin}>Cerrar sesión</button>
        </nav>
      </header>

      <div className="modeler-workspace">
        <aside className="modeler-tools" aria-label="Herramientas">
          <button className={tool === 'select' ? 'is-active' : ''} onClick={() => { setTool('select'); setDraftStart(null) }}>↖<span>Seleccionar</span></button>
          <button className={tool === 'wall' ? 'is-active' : ''} onClick={() => setTool('wall')}>╱<span>Muro</span></button>
          <button onClick={undo} disabled={!history.length}>↶<span>Deshacer</span></button>
          <button onClick={deleteSelected} disabled={!selectedId}>⌫<span>Eliminar</span></button>
        </aside>

        <main className="modeler-stage">
          <div className="modeler-stagebar">
            <div>
              <input className="modeler-project-name" style={{ width: 'min(280px, 35vw)', border: 0, borderBottom: '1px solid #bdb4a6', background: 'transparent', fontWeight: 800 }} value={projectName} maxLength="120" aria-label="Nombre del proyecto" onChange={(event) => { setProjectName(event.target.value); setSaveState('Cambios sin guardar') }} />
              <span>{saveState}{projectVersion ? ` · v${projectVersion}` : ''}</span>
            </div>
            <div className="modeler-view-toggle">
              <button className={view === 'top' ? 'is-active' : ''} onClick={() => setView('top')}>Planta</button>
              <button className={view === '3d' ? 'is-active' : ''} onClick={() => setView('3d')}>3D</button>
              <button onClick={save}>Guardar</button>
            </div>
          </div>
          <div className="modeler-canvas-wrap">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={(event) => setCursor(canvasPoint(event))}
              onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.min(70, Math.max(18, value - event.deltaY * 0.04))) }}
            />
            <div className="modeler-hint">{draftStart ? 'Elegí el punto final · Esc para cancelar' : 'Clic para iniciar un muro · rueda para acercar'}</div>
          </div>
        </main>

        <aside className="modeler-properties">
          <p className="modeler-eyebrow">Propiedades</p>
          <h2>{selectedWall ? 'Muro seleccionado' : 'Nuevo muro'}</h2>
          <label>Altura <span><input type="number" min="0.1" step="0.1" value={settings.height} onChange={(e) => setSettings({ ...settings, height: e.target.value })} /> m</span></label>
          <label>Espesor <span><input type="number" min="0.05" step="0.01" value={settings.thickness} onChange={(e) => setSettings({ ...settings, thickness: e.target.value })} /> m</span></label>
          <div className="modeler-summary">
            <div><strong>{walls.length}</strong><span>Muros</span></div>
            <div><strong>{totalLength.toFixed(1)} m</strong><span>Longitud</span></div>
          </div>
          <div className="modeler-list">
            <p>Elementos</p>
            {walls.length === 0 && <span>Todavía no hay elementos.</span>}
            {walls.map((wall, index) => (
              <button key={wall.id} className={selectedId === wall.id ? 'is-active' : ''} onClick={() => { setSelectedId(wall.id); setTool('select') }}>
                <span>Muro {index + 1}</span><small>{wallLength(wall).toFixed(2)} m</small>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}
