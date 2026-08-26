import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OxidaWordmark from '../components/OxidaWordmark'
import { getAdminModelerProject, saveAdminModelerProject } from '../lib/api'
import './AdminModeler.css'

const STORAGE_KEY = 'mercadobra-modeler-private-beta'
const GRID_SIZE = 0.25
const EMPTY_MODEL = { walls: [], openings: [], furniture: [] }
const DEFAULTS = { wallHeight: 2.7, wallThickness: 0.15, openingWidth: 0.9, openingHeight: 2.1, sill: 0.9, furnitureType: 'bed' }
const FURNITURE = {
  bed: { label: 'Cama', width: 1.6, depth: 2, height: 0.55, color: '#8da1aa' },
  sofa: { label: 'Sofá', width: 2, depth: 0.85, height: 0.8, color: '#9b806e' },
  table: { label: 'Mesa', width: 1.4, depth: 0.8, height: 0.75, color: '#a77b50' },
  chair: { label: 'Silla', width: 0.5, depth: 0.5, height: 0.9, color: '#b58b62' },
  wardrobe: { label: 'Placard', width: 1.8, depth: 0.6, height: 2.2, color: '#8d7359' },
  toilet: { label: 'Inodoro', width: 0.42, depth: 0.7, height: 0.75, color: '#d8ddd9' },
}

const snap = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE
const wallLength = (wall) => Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
const pointOnWall = (wall, t) => ({ x: wall.start.x + (wall.end.x - wall.start.x) * t, y: wall.start.y + (wall.end.y - wall.start.y) * t })

function loadLocalModel() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return { walls: saved?.walls || [], openings: saved?.openings || [], furniture: saved?.furniture || [] }
  } catch { return EMPTY_MODEL }
}

function segmentHit(point, start, end) {
  const dx = end.x - start.x; const dy = end.y - start.y
  const squared = dx * dx + dy * dy
  const t = squared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / squared)) : 0
  return { distance: Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy), t }
}

export default function AdminModeler() {
  const { adminUser, adminToken, logoutAdmin } = useAuth()
  const canvasRef = useRef(null)
  const [model, setModel] = useState(loadLocalModel)
  const [history, setHistory] = useState([])
  const [draftStart, setDraftStart] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [selection, setSelection] = useState(null)
  const [tool, setTool] = useState('wall')
  const [view, setView] = useState('3d')
  const [zoom, setZoom] = useState(34)
  const [settings, setSettings] = useState(DEFAULTS)
  const [saveState, setSaveState] = useState('Cargando proyecto…')
  const [projectName, setProjectName] = useState('Proyecto sin nombre')
  const [projectVersion, setProjectVersion] = useState(null)
  const [viewportRevision, setViewportRevision] = useState(0)

  const totalLength = useMemo(() => model.walls.reduce((sum, wall) => sum + wallLength(wall), 0), [model.walls])
  const selectedItem = selection && model[selection.collection]?.find((item) => item.id === selection.id)

  useEffect(() => {
    if (!adminToken || adminUser?.role !== 'admin') return
    let active = true
    getAdminModelerProject(adminToken).then(({ project }) => {
      if (!active) return
      if (project) {
        setModel({ walls: project.model?.walls || [], openings: project.model?.openings || [], furniture: project.model?.furniture || [] })
        setProjectName(project.name || 'Proyecto sin nombre'); setProjectVersion(project.version); setSaveState(`Versión ${project.version} cargada`)
      } else setSaveState('Proyecto nuevo')
    }).catch((error) => { if (active) setSaveState(`Sin conexión: ${error.message}`) })
    return () => { active = false }
  }, [adminToken, adminUser?.role])

  const project = useCallback((point, z = 0) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const cx = canvas.clientWidth / 2; const cy = canvas.clientHeight / 2 + 80
    if (view === 'top') return { x: cx + point.x * zoom, y: cy - point.y * zoom }
    return { x: cx + (point.x - point.y) * zoom * 0.82, y: cy + (point.x + point.y) * zoom * 0.38 - z * zoom }
  }, [view, zoom])

  const unproject = useCallback((x, y) => {
    const canvas = canvasRef.current; const cx = canvas.clientWidth / 2; const cy = canvas.clientHeight / 2 + 80
    if (view === 'top') return { x: snap((x - cx) / zoom), y: snap((cy - y) / zoom) }
    const a = (x - cx) / (zoom * 0.82); const b = (y - cy) / (zoom * 0.38)
    return { x: snap((a + b) / 2), y: snap((b - a) / 2) }
  }, [view, zoom])

  useEffect(() => {
    const cancel = (event) => { if (event.key === 'Escape') setDraftStart(null) }
    window.addEventListener('keydown', cancel); return () => window.removeEventListener('keydown', cancel)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current; const parent = canvas.parentElement
    const resize = () => { const ratio = window.devicePixelRatio || 1; canvas.width = parent.clientWidth * ratio; canvas.height = parent.clientHeight * ratio; canvas.style.width = `${parent.clientWidth}px`; canvas.style.height = `${parent.clientHeight}px`; setViewportRevision((value) => value + 1) }
    resize(); const observer = new ResizeObserver(resize); observer.observe(parent); return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const ratio = window.devicePixelRatio || 1
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio); ctx.fillStyle = '#ebe7df'; ctx.fillRect(0, 0, canvas.width / ratio, canvas.height / ratio)
    for (let n = -20; n <= 20; n += 1) {
      const xa = project({ x: n, y: -20 }); const xb = project({ x: n, y: 20 }); const ya = project({ x: -20, y: n }); const yb = project({ x: 20, y: n })
      ctx.lineWidth = 1; ctx.strokeStyle = n === 0 ? '#b86542' : '#d7d1c7'; ctx.beginPath(); ctx.moveTo(xa.x, xa.y); ctx.lineTo(xb.x, xb.y); ctx.stroke()
      ctx.strokeStyle = n === 0 ? '#596c66' : '#d7d1c7'; ctx.beginPath(); ctx.moveTo(ya.x, ya.y); ctx.lineTo(yb.x, yb.y); ctx.stroke()
    }
    model.walls.forEach((wall) => {
      const start = project(wall.start); const end = project(wall.end); const topStart = project(wall.start, wall.height); const topEnd = project(wall.end, wall.height)
      const selected = selection?.collection === 'walls' && selection.id === wall.id
      if (view === '3d') { ctx.fillStyle = selected ? '#c97752' : '#f7f3ea'; ctx.strokeStyle = selected ? '#8f4127' : '#5f5b54'; ctx.lineWidth = selected ? 2 : 1; ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.lineTo(topEnd.x, topEnd.y); ctx.lineTo(topStart.x, topStart.y); ctx.closePath(); ctx.fill(); ctx.stroke() }
      else { ctx.strokeStyle = selected ? '#b85e39' : '#34332f'; ctx.lineWidth = Math.max(4, wall.thickness * zoom); ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke() }
    })
    model.openings.forEach((opening) => {
      const wall = model.walls.find((item) => item.id === opening.wallId); if (!wall) return
      const center = pointOnWall(wall, opening.t); const length = wallLength(wall); const dx = (wall.end.x-wall.start.x)/length; const dy=(wall.end.y-wall.start.y)/length
      const a={x:center.x-dx*opening.width/2,y:center.y-dy*opening.width/2}; const b={x:center.x+dx*opening.width/2,y:center.y+dy*opening.width/2}; const z=opening.type==='window'?opening.sill:0
      const pa=project(a,z); const pb=project(b,z); const selected=selection?.collection==='openings'&&selection.id===opening.id
      ctx.strokeStyle=selected?'#e6542f':opening.type==='door'?'#9b5b35':'#2d8aa1'
      if(view==='3d'){
        const topA=project(a,z+opening.height);const topB=project(b,z+opening.height);ctx.fillStyle=opening.type==='door'?'#8a6248':'#87c6d5';ctx.lineWidth=selected?3:1.5;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.lineTo(topB.x,topB.y);ctx.lineTo(topA.x,topA.y);ctx.closePath();ctx.fill();ctx.stroke()
      }else{
        ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke()
        if(opening.type==='door'){const pc=project({x:a.x-dy*opening.width,y:a.y+dx*opening.width});ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pc.x,pc.y);ctx.stroke()}
      }
    })
    model.furniture.forEach((item) => {
      const def=FURNITURE[item.type]||FURNITURE.table; const selected=selection?.collection==='furniture'&&selection.id===item.id; const c=Math.cos(item.rotation||0);const s=Math.sin(item.rotation||0)
      const raw=[[-item.width/2,-item.depth/2],[item.width/2,-item.depth/2],[item.width/2,item.depth/2],[-item.width/2,item.depth/2]]; const world=raw.map(([x,y])=>({x:item.x+x*c-y*s,y:item.y+x*s+y*c})); const corners=world.map((p)=>project(p))
      ctx.fillStyle=selected?'#e49a70':def.color;ctx.strokeStyle=selected?'#9c4529':'#5c554d';ctx.lineWidth=selected?2:1;ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke()
      if(view==='3d'){const tops=world.map((p)=>project(p,item.height));ctx.fillStyle=selected?'#efb091':def.color;ctx.beginPath();tops.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke()}
      const label=project(item,view==='3d'?item.height+.15:0);ctx.fillStyle='#302f2b';ctx.font='600 11px sans-serif';ctx.textAlign='center';ctx.fillText(def.label,label.x,label.y)
    })
    if(draftStart&&cursor){const a=project(draftStart);const b=project(cursor);ctx.setLineDash([7,6]);ctx.strokeStyle='#b85e39';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([])}
  }, [model,selection,draftStart,cursor,project,view,zoom,viewportRevision])

  if (!adminUser || !adminToken || adminUser.role !== 'admin') return <Navigate to="/admin/login?redirect=/admin/modelador" replace />
  const screenPoint=(event)=>{const rect=canvasRef.current.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top}}
  const worldPoint=(event)=>{const p=screenPoint(event);return unproject(p.x,p.y)}
  const remember=()=>setHistory((items)=>[...items.slice(-49),structuredClone(model)])
  const chooseTool=(next)=>{setTool(next);setDraftStart(null);setSelection(null)}
  const nearestWall=(screen)=>model.walls.map((wall)=>({wall,...segmentHit(screen,project(wall.start),project(wall.end))})).sort((a,b)=>a.distance-b.distance)[0]

  function handleCanvasClick(event){
    const screen=screenPoint(event);const point=worldPoint(event)
    if(tool==='select'){
      const candidates=[...model.furniture.map((item)=>({collection:'furniture',id:item.id,distance:Math.hypot(screen.x-project(item).x,screen.y-project(item).y)})),...model.openings.map((item)=>{const wall=model.walls.find((w)=>w.id===item.wallId);const p=wall?project(pointOnWall(wall,item.t)):screen;return{collection:'openings',id:item.id,distance:Math.hypot(screen.x-p.x,screen.y-p.y)}}),...model.walls.map((wall)=>({collection:'walls',id:wall.id,distance:segmentHit(screen,project(wall.start),project(wall.end)).distance}))].sort((a,b)=>a.distance-b.distance)
      setSelection(candidates[0]?.distance<=18?candidates[0]:null);return
    }
    if(tool==='wall'){
      if(!draftStart){setDraftStart(point);return}if(point.x===draftStart.x&&point.y===draftStart.y)return
      remember();setModel((current)=>({...current,walls:[...current.walls,{id:crypto.randomUUID(),start:draftStart,end:point,height:Number(settings.wallHeight),thickness:Number(settings.wallThickness)}]}));setDraftStart(point)
    }else if(tool==='door'||tool==='window'){
      const hit=nearestWall(screen);if(!hit||hit.distance>24){setSaveState('Elegí un punto sobre un muro');return}
      remember();setModel((current)=>({...current,openings:[...current.openings,{id:crypto.randomUUID(),type:tool,wallId:hit.wall.id,t:Math.max(.05,Math.min(.95,hit.t)),width:Number(settings.openingWidth),height:Number(settings.openingHeight),sill:tool==='window'?Number(settings.sill):0}]}))
    }else if(tool==='furniture'){
      const def=FURNITURE[settings.furnitureType];remember();setModel((current)=>({...current,furniture:[...current.furniture,{id:crypto.randomUUID(),type:settings.furnitureType,x:point.x,y:point.y,width:def.width,depth:def.depth,height:def.height,rotation:0}]}))
    }setSaveState('Cambios sin guardar')
  }
  function undo(){if(!history.length)return;setModel(history.at(-1));setHistory((items)=>items.slice(0,-1));setSelection(null);setDraftStart(null);setSaveState('Cambios sin guardar')}
  async function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify({...model,updatedAt:new Date().toISOString()}));setSaveState('Guardando…');try{const{project:saved}=await saveAdminModelerProject({name:projectName,model},adminToken);setProjectVersion(saved.version);setSaveState(`Guardado · versión ${saved.version}`)}catch(error){setSaveState(`Guardado local · ${error.message}`)}}
  function deleteSelected(){if(!selection)return;remember();setModel((current)=>{const next={...current,[selection.collection]:current[selection.collection].filter((item)=>item.id!==selection.id)};if(selection.collection==='walls')next.openings=current.openings.filter((item)=>item.wallId!==selection.id);return next});setSelection(null);setSaveState('Cambios sin guardar')}
  function rotateSelected(){if(selection?.collection!=='furniture')return;remember();setModel((current)=>({...current,furniture:current.furniture.map((item)=>item.id===selection.id?{...item,rotation:(item.rotation||0)+Math.PI/2}:item)}));setSaveState('Cambios sin guardar')}
  const title=selectedItem?`${selection.collection==='walls'?'Muro':selection.collection==='openings'?(selectedItem.type==='door'?'Puerta':'Ventana'):FURNITURE[selectedItem.type]?.label} seleccionado`:tool==='door'?'Nueva puerta':tool==='window'?'Nueva ventana':tool==='furniture'?'Nuevo mueble':'Nuevo muro'

  return <section className="modeler-page"><header className="modeler-header"><div className="modeler-brand"><OxidaWordmark/><span>MercadoBRA Modelador</span><em>Beta privada</em></div><nav><Link to="/admin/productos">Productos</Link><Link to="/admin/clientes">Clientes</Link><button type="button" onClick={logoutAdmin}>Cerrar sesión</button></nav></header><div className="modeler-workspace">
    <aside className="modeler-tools" aria-label="Herramientas"><button className={tool==='select'?'is-active':''} onClick={()=>chooseTool('select')}>↖<span>Seleccionar</span></button><button className={tool==='wall'?'is-active':''} onClick={()=>chooseTool('wall')}>╱<span>Muro</span></button><button className={tool==='door'?'is-active':''} onClick={()=>chooseTool('door')}>▯<span>Puerta</span></button><button className={tool==='window'?'is-active':''} onClick={()=>chooseTool('window')}>▣<span>Ventana</span></button><button className={tool==='furniture'?'is-active':''} onClick={()=>chooseTool('furniture')}>▰<span>Muebles</span></button><button onClick={undo} disabled={!history.length}>↶<span>Deshacer</span></button><button onClick={deleteSelected} disabled={!selection}>⌫<span>Eliminar</span></button></aside>
    <main className="modeler-stage"><div className="modeler-stagebar"><div><input style={{width:'min(280px,35vw)',border:0,borderBottom:'1px solid #bdb4a6',background:'transparent',fontWeight:800}} value={projectName} maxLength="120" aria-label="Nombre del proyecto" onChange={(e)=>{setProjectName(e.target.value);setSaveState('Cambios sin guardar')}}/><span>{saveState}{projectVersion?` · v${projectVersion}`:''}</span></div><div className="modeler-view-toggle"><button className={view==='top'?'is-active':''} onClick={()=>setView('top')}>Planta</button><button className={view==='3d'?'is-active':''} onClick={()=>setView('3d')}>3D</button><button onClick={save}>Guardar</button></div></div><div className="modeler-canvas-wrap"><canvas ref={canvasRef} onClick={handleCanvasClick} onMouseMove={(e)=>setCursor(worldPoint(e))} onWheel={(e)=>{e.preventDefault();setZoom((value)=>Math.min(70,Math.max(18,value-e.deltaY*.04)))}}/><div className="modeler-hint">{tool==='wall'?(draftStart?'Elegí el punto final · Esc para cancelar':'Clic para iniciar un muro'):tool==='door'||tool==='window'?'Hacé clic sobre un muro':tool==='furniture'?'Hacé clic para ubicar el mueble':'Seleccioná un elemento'}</div></div></main>
    <aside className="modeler-properties"><p className="modeler-eyebrow">Propiedades</p><h2>{title}</h2>{tool==='wall'&&!selectedItem&&<><label>Altura <span><input type="number" min=".1" step=".1" value={settings.wallHeight} onChange={(e)=>setSettings({...settings,wallHeight:e.target.value})}/> m</span></label><label>Espesor <span><input type="number" min=".05" step=".01" value={settings.wallThickness} onChange={(e)=>setSettings({...settings,wallThickness:e.target.value})}/> m</span></label></>}{(tool==='door'||tool==='window')&&!selectedItem&&<><label>Ancho <span><input type="number" min=".3" step=".1" value={settings.openingWidth} onChange={(e)=>setSettings({...settings,openingWidth:e.target.value})}/> m</span></label><label>Alto <span><input type="number" min=".3" step=".1" value={settings.openingHeight} onChange={(e)=>setSettings({...settings,openingHeight:e.target.value})}/> m</span></label>{tool==='window'&&<label>Antepecho <span><input type="number" min="0" step=".1" value={settings.sill} onChange={(e)=>setSettings({...settings,sill:e.target.value})}/> m</span></label>}</>}{tool==='furniture'&&!selectedItem&&<label>Tipo <select value={settings.furnitureType} onChange={(e)=>setSettings({...settings,furnitureType:e.target.value})}>{Object.entries(FURNITURE).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></label>}{selection?.collection==='furniture'&&<button className="modeler-property-action" onClick={rotateSelected}>Rotar 90°</button>}
      <div className="modeler-summary"><div><strong>{model.walls.length}</strong><span>Muros</span></div><div><strong>{model.openings.length}</strong><span>Aberturas</span></div><div><strong>{model.furniture.length}</strong><span>Muebles</span></div><div><strong>{totalLength.toFixed(1)} m</strong><span>Longitud</span></div></div><div className="modeler-list"><p>Elementos</p>{model.walls.map((item,i)=><button key={item.id} className={selection?.id===item.id?'is-active':''} onClick={()=>{setSelection({collection:'walls',id:item.id});setTool('select')}}><span>Muro {i+1}</span><small>{wallLength(item).toFixed(2)} m</small></button>)}{model.openings.map((item,i)=><button key={item.id} className={selection?.id===item.id?'is-active':''} onClick={()=>{setSelection({collection:'openings',id:item.id});setTool('select')}}><span>{item.type==='door'?'Puerta':'Ventana'} {i+1}</span><small>{item.width.toFixed(2)} m</small></button>)}{model.furniture.map((item,i)=><button key={item.id} className={selection?.id===item.id?'is-active':''} onClick={()=>{setSelection({collection:'furniture',id:item.id});setTool('select')}}><span>{FURNITURE[item.type]?.label} {i+1}</span><small>{item.width.toFixed(2)} m</small></button>)}</div>
    </aside></div></section>
}
