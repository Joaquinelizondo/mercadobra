import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OxidaWordmark from '../components/OxidaWordmark'
import { getAdminModelerProject, interpretAdminModelerPrompt, saveAdminModelerProject } from '../lib/api'
import {
  EMPTY_MODEL,
  FURNITURE,
  appendWall,
  constrainOrthogonal,
  deleteElement,
  findOpeningPlacement,
  moveOpening,
  moveWallEndpoint,
  normalizeModel,
  pointOnWall,
  rememberModel,
  rotateFurniture,
  segmentHit,
  setWallLength,
  snap,
  updateFurniture,
  updateOpening,
  updateWall,
  undoModel,
  validateOpeningPlacement,
  wallLength,
} from '../modeler/core'
import './AdminModeler.css'

const STORAGE_KEY = 'mercadobra-modeler-private-beta'
const DEFAULTS = { wallHeight: 2.7, wallThickness: 0.15, openingWidth: 0.9, openingHeight: 2.1, sill: 0.9, furnitureType: 'bed' }
const Modeler3DView = lazy(() => import('../modeler/Modeler3DView'))

function loadLocalModel() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return normalizeModel(saved)
  } catch { return EMPTY_MODEL }
}

export default function AdminModeler() {
  const { adminUser, adminToken, logoutAdmin } = useAuth()
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const projectLoadedRef = useRef(false)
  const suppressAutosaveRef = useRef(false)
  const savingRef = useRef(false)
  const versionRef = useRef(null)
  const modelRef = useRef(null)
  const projectNameRef = useRef('Proyecto sin nombre')
  const saveConflictRef = useRef(false)
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
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPrompt, setChatPrompt] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [pendingPlan, setPendingPlan] = useState(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [orthogonalLock, setOrthogonalLock] = useState(false)

  const totalLength = useMemo(() => model.walls.reduce((sum, wall) => sum + wallLength(wall), 0), [model.walls])
  const selectedItem = selection && model[selection.collection]?.find((item) => item.id === selection.id)
  modelRef.current = model
  projectNameRef.current = projectName

  useEffect(() => {
    if (!adminToken || adminUser?.role !== 'admin') return
    let active = true
    getAdminModelerProject(adminToken).then(({ project }) => {
      if (!active) return
      if (project) {
        suppressAutosaveRef.current = true; versionRef.current = project.version; saveConflictRef.current = false
        setModel(normalizeModel(project.model))
        setProjectName(project.name || 'Proyecto sin nombre'); setProjectVersion(project.version); setSaveState(`Versión ${project.version} cargada`)
      } else { versionRef.current = null; setSaveState('Proyecto nuevo') }
      projectLoadedRef.current = true
    }).catch((error) => { if (active) { projectLoadedRef.current = true; setSaveState(`Sin conexión: ${error.message}`) } })
    return () => { active = false }
  }, [adminToken, adminUser?.role])

  const persistProject = useCallback(async (manual = false) => {
    const snapshot = modelRef.current; const name = projectNameRef.current
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snapshot, updatedAt: new Date().toISOString() }))
    if (savingRef.current || saveConflictRef.current || !adminToken) return
    savingRef.current = true; setSaveState(manual ? 'Guardando…' : 'Guardando automáticamente…')
    try {
      const { project: saved } = await saveAdminModelerProject({ name, model: snapshot, version: versionRef.current }, adminToken)
      versionRef.current = saved.version; setProjectVersion(saved.version); setSaveState(`${manual ? 'Guardado' : 'Autoguardado'} · versión ${saved.version}`)
    } catch (error) {
      if (error.code === 'MODELER_VERSION_CONFLICT' || error.status === 409) { saveConflictRef.current = true; setSaveState('Conflicto de versión · recargá antes de guardar') }
      else setSaveState(`Guardado local · ${error.message}`)
    } finally { savingRef.current = false }
  }, [adminToken])

  useEffect(() => {
    if (!projectLoadedRef.current) return
    if (suppressAutosaveRef.current) { suppressAutosaveRef.current = false; return }
    setSaveState('Cambios sin guardar')
    const timer = window.setTimeout(() => { void persistProject(false) }, 1500)
    return () => window.clearTimeout(timer)
  }, [model, projectName, persistProject])

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
    const cancel = (event) => { if (event.key === 'Escape') { setDraftStart(null); setOrthogonalLock(false) } }
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
      if (selected) {
        for (const point of [start, end]) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#b85e39'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(point.x, point.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
      }
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
      if(selected){const handle=project(center,z);ctx.fillStyle='#fff';ctx.strokeStyle='#e6542f';ctx.lineWidth=3;ctx.beginPath();ctx.arc(handle.x,handle.y,7,0,Math.PI*2);ctx.fill();ctx.stroke()}
    })
    model.furniture.forEach((item) => {
      const def=FURNITURE[item.type]||FURNITURE.table; const selected=selection?.collection==='furniture'&&selection.id===item.id; const c=Math.cos(item.rotation||0);const s=Math.sin(item.rotation||0)
      const raw=[[-item.width/2,-item.depth/2],[item.width/2,-item.depth/2],[item.width/2,item.depth/2],[-item.width/2,item.depth/2]]; const world=raw.map(([x,y])=>({x:item.x+x*c-y*s,y:item.y+x*s+y*c})); const corners=world.map((p)=>project(p))
      ctx.fillStyle=selected?'#e49a70':def.color;ctx.strokeStyle=selected?'#9c4529':'#5c554d';ctx.lineWidth=selected?2:1;ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke()
      if(view==='3d'){const tops=world.map((p)=>project(p,item.height));ctx.fillStyle=selected?'#efb091':def.color;ctx.beginPath();tops.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke()}
      const label=project(item,view==='3d'?item.height+.15:0);ctx.fillStyle='#302f2b';ctx.font='600 11px sans-serif';ctx.textAlign='center';ctx.fillText(def.label,label.x,label.y)
    })
    if(draftStart&&cursor){
      const a=project(draftStart);const b=project(cursor);ctx.setLineDash([7,6]);ctx.strokeStyle='#b85e39';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([])
      const dx=cursor.x-draftStart.x;const dy=cursor.y-draftStart.y;const length=Math.hypot(dx,dy);const label=`${length.toFixed(2)} m  ·  ΔX ${Math.abs(dx).toFixed(2)}  ·  ΔY ${Math.abs(dy).toFixed(2)}${orthogonalLock?'  ·  ORTO':''}`;const midpoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2-14}
      ctx.font='700 12px sans-serif';ctx.textAlign='center';const width=ctx.measureText(label).width+18;ctx.fillStyle='rgba(45,46,41,.9)';ctx.fillRect(midpoint.x-width/2,midpoint.y-14,width,24);ctx.fillStyle='#fff';ctx.fillText(label,midpoint.x,midpoint.y+3)
    }
  }, [model,selection,draftStart,cursor,orthogonalLock,project,view,zoom,viewportRevision])

  if (!adminUser || !adminToken || adminUser.role !== 'admin') return <Navigate to="/admin/login?redirect=/admin/modelador" replace />
  const screenPoint=(event)=>{const rect=canvasRef.current.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top}}
  const worldPoint=(event)=>{const p=screenPoint(event);return unproject(p.x,p.y)}
  const remember=()=>setHistory((items)=>rememberModel(items,model))
  const chooseTool=(next)=>{setTool(next);setDraftStart(null);setSelection(null);setOrthogonalLock(false)}
  const nearestWall=(screen)=>model.walls.map((wall)=>({wall,...segmentHit(screen,project(wall.start),project(wall.end))})).sort((a,b)=>a.distance-b.distance)[0]

  function handleCanvasClick(event){
    if(suppressClickRef.current){suppressClickRef.current=false;return}
    const screen=screenPoint(event);const basePoint=worldPoint(event);const point=tool==='wall'&&draftStart&&event.shiftKey?constrainOrthogonal(draftStart,basePoint):basePoint
    if(tool==='select'){
      const candidates=[...model.furniture.map((item)=>({collection:'furniture',id:item.id,distance:Math.hypot(screen.x-project(item).x,screen.y-project(item).y)})),...model.openings.map((item)=>{const wall=model.walls.find((w)=>w.id===item.wallId);const p=wall?project(pointOnWall(wall,item.t)):screen;return{collection:'openings',id:item.id,distance:Math.hypot(screen.x-p.x,screen.y-p.y)}}),...model.walls.map((wall)=>({collection:'walls',id:wall.id,distance:segmentHit(screen,project(wall.start),project(wall.end)).distance}))].sort((a,b)=>a.distance-b.distance)
      setSelection(candidates[0]?.distance<=18?candidates[0]:null);return
    }
    if(tool==='wall'){
      if(!draftStart){setDraftStart(point);return}if(point.x===draftStart.x&&point.y===draftStart.y)return
      remember();setModel((current)=>appendWall(current,{id:crypto.randomUUID(),start:draftStart,end:point,height:Number(settings.wallHeight),thickness:Number(settings.wallThickness)}));setDraftStart(point)
    }else if(tool==='door'||tool==='window'){
      const hit=nearestWall(screen);if(!hit||hit.distance>24){setSaveState('Elegí un punto sobre un muro');return}
      const opening={id:crypto.randomUUID(),type:tool,wallId:hit.wall.id,t:hit.t,width:Number(settings.openingWidth),height:Number(settings.openingHeight),sill:tool==='window'?Number(settings.sill):0};const validation=validateOpeningPlacement(model,opening)
      if(!validation.valid){setSaveState(validation.reason);return}
      remember();setModel((current)=>({...current,openings:[...current.openings,opening]}))
    }else if(tool==='furniture'){
      const def=FURNITURE[settings.furnitureType];const id=crypto.randomUUID();remember();setModel((current)=>({...current,furniture:[...current.furniture,{id,type:settings.furnitureType,x:point.x,y:point.y,width:def.width,depth:def.depth,height:def.height,rotation:0}]}));setSelection({collection:'furniture',id});setTool('select')
    }setSaveState('Cambios sin guardar')
  }
  function undo(){const result=undoModel(history,model);if(!result.changed)return;setModel(result.model);setHistory(result.history);setSelection(null);setDraftStart(null);setSaveState('Cambios sin guardar')}
  function save(){void persistProject(true)}
  function deleteSelected(){if(!selection)return;remember();setModel((current)=>deleteElement(current,selection));setSelection(null);setSaveState('Cambios sin guardar')}
  function rotateSelected(){if(selection?.collection!=='furniture')return;remember();setModel((current)=>rotateFurniture(current,selection.id));setSaveState('Cambios sin guardar')}
  function updateSelectedFurniture(field,value){
    if(selection?.collection!=='furniture')return
    setModel((current)=>updateFurniture(current,selection.id,field,value));setSaveState('Cambios sin guardar')
  }
  function updateSelectedWall(field,value){
    if(selection?.collection!=='walls')return
    setModel((current)=>field==='length'?setWallLength(current,selection.id,value):updateWall(current,selection.id,field,value));setSaveState('Cambios sin guardar')
  }
  function updateSelectedOpening(field,value){
    if(selection?.collection!=='openings')return
    const currentOpening=model.openings.find((item)=>item.id===selection.id);const next=updateOpening(model,selection.id,field,value);const nextOpening=next.openings.find((item)=>item.id===selection.id)
    setModel(next);setSaveState(currentOpening===nextOpening&&Number(value)!==Number(currentOpening?.[field])?'No se puede aplicar esa medida: revisá los límites y otras aberturas.':'Cambios sin guardar')
  }
  function handlePointerDown(event){
    if(tool!=='select')return
    if(selection?.collection==='walls'){
      const wall=model.walls.find((item)=>item.id===selection.id)
      if(wall){
        const screen=screenPoint(event);const endpoints=['start','end'].map((endpoint)=>({endpoint,distance:Math.hypot(screen.x-project(wall[endpoint]).x,screen.y-project(wall[endpoint]).y)})).sort((a,b)=>a.distance-b.distance)
        if(endpoints[0].distance<=16){remember();dragRef.current={kind:'wall-endpoint',id:wall.id,endpoint:endpoints[0].endpoint,start:screen};event.currentTarget.setPointerCapture(event.pointerId);return}
      }
    }
    if(selection?.collection==='openings'){
      const opening=model.openings.find((item)=>item.id===selection.id);const wall=opening&&model.walls.find((item)=>item.id===opening.wallId)
      if(opening&&wall){const screen=screenPoint(event);const center=project(pointOnWall(wall,opening.t),opening.type==='window'?opening.sill:0);if(Math.hypot(screen.x-center.x,screen.y-center.y)<=18){remember();dragRef.current={kind:'opening',id:opening.id,wallId:wall.id,start:screen};event.currentTarget.setPointerCapture(event.pointerId);return}}
    }
    const screen=screenPoint(event);const closest=model.furniture.map((item)=>({item,distance:Math.hypot(screen.x-project(item).x,screen.y-project(item).y)})).sort((a,b)=>a.distance-b.distance)[0]
    if(!closest||closest.distance>24)return
    remember();dragRef.current={kind:'furniture',id:closest.item.id,start:screen};setSelection({collection:'furniture',id:closest.item.id});event.currentTarget.setPointerCapture(event.pointerId)
  }
  function handlePointerMove(event){
    const basePoint=worldPoint(event);const drawingOrthogonal=tool==='wall'&&draftStart&&event.shiftKey;setCursor(drawingOrthogonal?constrainOrthogonal(draftStart,basePoint):basePoint);setOrthogonalLock(Boolean(drawingOrthogonal));if(!dragRef.current)return
    const screen=screenPoint(event);if(Math.hypot(screen.x-dragRef.current.start.x,screen.y-dragRef.current.start.y)>3)suppressClickRef.current=true
    const point=worldPoint(event);const dragged=dragRef.current
    if(dragged.kind==='wall-endpoint'){setModel((current)=>moveWallEndpoint(current,dragged.id,dragged.endpoint,point));setSaveState('Cambios sin guardar')}
    else if(dragged.kind==='opening'){
      const wall=model.walls.find((item)=>item.id===dragged.wallId)
      if(wall){const hit=segmentHit(screen,project(wall.start),project(wall.end));const currentOpening=model.openings.find((item)=>item.id===dragged.id);const next=moveOpening(model,dragged.id,hit.t);const nextOpening=next.openings.find((item)=>item.id===dragged.id);setModel(next);setSaveState(currentOpening===nextOpening&&Math.abs(hit.t-currentOpening.t)>.001?'Movimiento bloqueado: la abertura se superpone o sale del muro.':'Cambios sin guardar')}
    }
    else {setModel((current)=>({...current,furniture:current.furniture.map((item)=>item.id===dragged.id?{...item,x:point.x,y:point.y}:item)}));setSaveState('Cambios sin guardar')}
  }
  function handlePointerUp(event){if(!dragRef.current)return;dragRef.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
  async function submitPrompt(event){
    event.preventDefault();const message=chatPrompt.trim();if(!message||chatLoading)return
    setChatMessages((items)=>[...items,{role:'user',content:message}]);setChatPrompt('');setPendingPlan(null);setChatLoading(true)
    try{const plan=await interpretAdminModelerPrompt({message,model:{wallCount:model.walls.length,openingCount:model.openings.length,furnitureCount:model.furniture.length}},adminToken);setPendingPlan(plan);setChatMessages((items)=>[...items,{role:'assistant',content:plan.reply}])}
    catch(error){setChatMessages((items)=>[...items,{role:'assistant',content:`No pude interpretar el pedido: ${error.message}`}])}
    finally{setChatLoading(false)}
  }
  function applyPendingPlan(){
    if(!pendingPlan?.actions?.length)return;remember()
    setModel((current)=>{
      let next=structuredClone(current)
      for(const action of pendingPlan.actions){
        if(action.type==='clear_model'){next.walls=[];next.openings=[];next.furniture=[];continue}
        if(action.type==='create_room'){
          const width=Math.max(.5,Number(action.width)||4);const depth=Math.max(.5,Number(action.depth)||3);const height=Math.max(.5,Number(action.height)||2.7);const thickness=Math.max(.05,Number(action.thickness)||.15)
          const maxX=next.walls.length?Math.max(...next.walls.flatMap((wall)=>[wall.start.x,wall.end.x]))+1:0;const points=[{x:maxX,y:0},{x:maxX+width,y:0},{x:maxX+width,y:depth},{x:maxX,y:depth}]
          for(let index=0;index<4;index+=1)next.walls.push({id:crypto.randomUUID(),start:points[index],end:points[(index+1)%4],height,thickness})
          continue
        }
        if(action.type==='add_door'||action.type==='add_window'){
          const wall=next.walls[Math.max(0,Math.min(next.walls.length-1,Number(action.wallIndex)||0))];if(!wall)continue
          const opening={id:crypto.randomUUID(),type:action.type==='add_door'?'door':'window',wallId:wall.id,t:Math.max(.05,Math.min(.95,Number(action.position)||.5)),width:Math.max(.2,Number(action.width)||(action.type==='add_door' ? .9 : 1.2)),height:Math.max(.2,Number(action.height)||(action.type==='add_door'?2.1:1.1)),sill:action.type==='add_window'?Math.max(0,Number(action.sill)||.9):0};const placement=findOpeningPlacement(next,opening,Number(action.wallIndex)||0);if(placement)next={...next,openings:[...next.openings,placement]};continue
        }
        if(action.type==='add_furniture'&&FURNITURE[action.furnitureType]){
          const def=FURNITURE[action.furnitureType];const offset=next.furniture.length*.5;next.furniture.push({id:crypto.randomUUID(),type:action.furnitureType,x:1+offset,y:1+offset,width:Math.max(.1,Number(action.width)||def.width),depth:Math.max(.1,Number(action.depth)||def.depth),height:Math.max(.1,Number(action.height)||def.height),rotation:0})
        }
      }return next
    });setPendingPlan(null);setChatMessages((items)=>[...items,{role:'assistant',content:'Listo. Apliqué las acciones al modelo; podés deshacerlas como un solo cambio.'}]);setSaveState('Cambios sin guardar')
  }
  const title=selectedItem?`${selection.collection==='walls'?'Muro':selection.collection==='openings'?(selectedItem.type==='door'?'Puerta':'Ventana'):FURNITURE[selectedItem.type]?.label} seleccionado`:tool==='door'?'Nueva puerta':tool==='window'?'Nueva ventana':tool==='furniture'?'Nuevo mueble':'Nuevo muro'

  return <section className="modeler-page"><header className="modeler-header"><div className="modeler-brand"><OxidaWordmark/><span>MercadoBRA Modelador</span><em>Beta privada</em></div><nav><Link to="/admin/productos">Productos</Link><Link to="/admin/clientes">Clientes</Link><button type="button" onClick={logoutAdmin}>Cerrar sesión</button></nav></header><div className="modeler-workspace">
    <aside className="modeler-tools" aria-label="Herramientas"><button className={tool==='select'?'is-active':''} onClick={()=>chooseTool('select')}>↖<span>Seleccionar</span></button><button className={tool==='wall'?'is-active':''} onClick={()=>chooseTool('wall')}>╱<span>Muro</span></button><button className={tool==='door'?'is-active':''} onClick={()=>chooseTool('door')}>▯<span>Puerta</span></button><button className={tool==='window'?'is-active':''} onClick={()=>chooseTool('window')}>▣<span>Ventana</span></button><button className={tool==='furniture'?'is-active':''} onClick={()=>chooseTool('furniture')}>▰<span>Muebles</span></button><button onClick={undo} disabled={!history.length}>↶<span>Deshacer</span></button><button onClick={deleteSelected} disabled={!selection}>⌫<span>Eliminar</span></button></aside>
    <main className="modeler-stage"><div className="modeler-stagebar"><div><input style={{width:'min(280px,35vw)',border:0,borderBottom:'1px solid #bdb4a6',background:'transparent',fontWeight:800}} value={projectName} maxLength="120" aria-label="Nombre del proyecto" onChange={(e)=>{setProjectName(e.target.value);setSaveState('Cambios sin guardar')}}/><span>{saveState}{projectVersion?` · v${projectVersion}`:''}</span></div><div className="modeler-view-toggle"><button onClick={()=>setChatOpen((value)=>!value)}>Asistente</button><button className={view==='top'?'is-active':''} onClick={()=>setView('top')}>Planta</button><button className={view==='3d'?'is-active':''} onClick={()=>setView('3d')}>3D</button><button onClick={save}>Guardar</button></div></div><div className="modeler-canvas-wrap"><canvas ref={canvasRef} style={{touchAction:'none',display:view==='top'?'block':'none'}} onClick={handleCanvasClick} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={(e)=>{e.preventDefault();setZoom((value)=>Math.min(70,Math.max(18,value-e.deltaY*.04)))}}/>{view==='3d'&&<Suspense fallback={<div className="modeler-three-loading">Preparando motor 3D…</div>}><Modeler3DView model={model} selection={selection} onSelect={(next)=>{setSelection(next);if(next)setTool('select')}}/></Suspense>}<div className="modeler-hint">{view==='3d'?'Arrastrá para orbitar · rueda para acercar · clic para seleccionar':tool==='wall'?(draftStart?'Elegí el punto final · Shift bloquea el eje · Esc cancela':'Clic para iniciar un muro'):tool==='door'||tool==='window'?'Hacé clic sobre un muro':tool==='furniture'?'Hacé clic para ubicar el mueble':selection?.collection==='furniture'?'Arrastrá el mueble para moverlo':'Seleccioná un elemento'}</div>{!chatOpen&&<button type="button" className="modeler-chat-trigger" onClick={()=>setChatOpen(true)}><span>✦</span> Chat IA</button>}{chatOpen&&<section className="modeler-chat" aria-label="Asistente del simulador"><header><div><strong>Asistente de diseño</strong><span>Solo admin · acciones controladas</span></div><button type="button" onClick={()=>setChatOpen(false)}>×</button></header><div className="modeler-chat-messages">{chatMessages.length===0&&<p className="modeler-chat-empty">Probá: “Creá una habitación de 4 x 3 m con una cama”.</p>}{chatMessages.map((message,index)=><p key={index} className={`is-${message.role}`}>{message.content}</p>)}{chatLoading&&<p className="is-assistant">Interpretando…</p>}</div>{pendingPlan?.actions?.length>0&&<div className="modeler-chat-plan"><strong>Vista previa</strong>{pendingPlan.actions.map((action,index)=><span key={index}>{index+1}. {action.type.replaceAll('_',' ')}</span>)}<div><button onClick={()=>setPendingPlan(null)}>Cancelar</button><button onClick={applyPendingPlan}>Aplicar cambios</button></div></div>}<form onSubmit={submitPrompt}><input value={chatPrompt} onChange={(e)=>setChatPrompt(e.target.value)} maxLength="1200" placeholder="Indicá qué querés crear…"/><button disabled={chatLoading||!chatPrompt.trim()}>Enviar</button></form></section>}</div></main>
    <aside className="modeler-properties"><p className="modeler-eyebrow">Propiedades</p><h2>{title}</h2>{tool==='wall'&&!selectedItem&&<><label>Altura <span><input type="number" min=".1" step=".1" value={settings.wallHeight} onChange={(e)=>setSettings({...settings,wallHeight:e.target.value})}/> m</span></label><label>Espesor <span><input type="number" min=".05" step=".01" value={settings.wallThickness} onChange={(e)=>setSettings({...settings,wallThickness:e.target.value})}/> m</span></label></>}{selection?.collection==='walls'&&selectedItem&&<><label>Longitud <span><input type="number" min=".1" step=".05" value={Number(wallLength(selectedItem).toFixed(3))} onFocus={remember} onChange={(e)=>updateSelectedWall('length',e.target.value)}/> m</span></label><label>Altura <span><input type="number" min=".1" step=".1" value={selectedItem.height} onFocus={remember} onChange={(e)=>updateSelectedWall('height',e.target.value)}/> m</span></label><label>Espesor <span><input type="number" min=".01" step=".01" value={selectedItem.thickness} onFocus={remember} onChange={(e)=>updateSelectedWall('thickness',e.target.value)}/> m</span></label><p className="modeler-property-note">Arrastrá los círculos del muro para mover sus extremos sobre la rejilla.</p></>}{selection?.collection==='openings'&&selectedItem&&<><label>Ancho <span><input type="number" min=".2" step=".05" value={selectedItem.width} onFocus={remember} onChange={(e)=>updateSelectedOpening('width',e.target.value)}/> m</span></label><label>Alto <span><input type="number" min=".2" step=".05" value={selectedItem.height} onFocus={remember} onChange={(e)=>updateSelectedOpening('height',e.target.value)}/> m</span></label>{selectedItem.type==='window'&&<label>Antepecho <span><input type="number" min="0" step=".05" value={selectedItem.sill} onFocus={remember} onChange={(e)=>updateSelectedOpening('sill',e.target.value)}/> m</span></label>}<p className="modeler-property-note">Arrastrá el círculo para mover la abertura sin sacarla del muro.</p></>}{(tool==='door'||tool==='window')&&!selectedItem&&<><label>Ancho <span><input type="number" min=".3" step=".1" value={settings.openingWidth} onChange={(e)=>setSettings({...settings,openingWidth:e.target.value})}/> m</span></label><label>Alto <span><input type="number" min=".3" step=".1" value={settings.openingHeight} onChange={(e)=>setSettings({...settings,openingHeight:e.target.value})}/> m</span></label>{tool==='window'&&<label>Antepecho <span><input type="number" min="0" step=".1" value={settings.sill} onChange={(e)=>setSettings({...settings,sill:e.target.value})}/> m</span></label>}</>}{tool==='furniture'&&!selectedItem&&<label>Tipo <select value={settings.furnitureType} onChange={(e)=>setSettings({...settings,furnitureType:e.target.value})}>{Object.entries(FURNITURE).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></label>}{selection?.collection==='furniture'&&selectedItem&&<><label>Ancho <span><input type="number" min=".1" step=".1" value={selectedItem.width} onFocus={remember} onChange={(e)=>updateSelectedFurniture('width',e.target.value)}/> m</span></label><label>Profundidad <span><input type="number" min=".1" step=".1" value={selectedItem.depth} onFocus={remember} onChange={(e)=>updateSelectedFurniture('depth',e.target.value)}/> m</span></label><label>Altura <span><input type="number" min=".1" step=".1" value={selectedItem.height} onFocus={remember} onChange={(e)=>updateSelectedFurniture('height',e.target.value)}/> m</span></label><label>Posición X <span><input type="number" step=".25" value={selectedItem.x} onFocus={remember} onChange={(e)=>updateSelectedFurniture('x',e.target.value)}/> m</span></label><label>Posición Y <span><input type="number" step=".25" value={selectedItem.y} onFocus={remember} onChange={(e)=>updateSelectedFurniture('y',e.target.value)}/> m</span></label><label>Rotación <span><input type="number" min="-360" max="360" step="5" value={Math.round((selectedItem.rotation||0)*180/Math.PI)} onFocus={remember} onChange={(e)=>updateSelectedFurniture('rotation',e.target.value)}/> °</span></label><button className="modeler-property-action" onClick={rotateSelected}>Rotar 90°</button></>}
      <div className="modeler-summary"><div><strong>{model.walls.length}</strong><span>Muros</span></div><div><strong>{model.openings.length}</strong><span>Aberturas</span></div><div><strong>{model.furniture.length}</strong><span>Muebles</span></div><div><strong>{totalLength.toFixed(1)} m</strong><span>Longitud</span></div></div><div className="modeler-list"><p>Elementos</p>{model.walls.map((item,i)=><button key={item.id} className={selection?.id===item.id?'is-active':''} onClick={()=>{setSelection({collection:'walls',id:item.id});setTool('select')}}><span>Muro {i+1}</span><small>{wallLength(item).toFixed(2)} m</small></button>)}{model.openings.map((item,i)=><button key={item.id} className={selection?.id===item.id?'is-active':''} onClick={()=>{setSelection({collection:'openings',id:item.id});setTool('select')}}><span>{item.type==='door'?'Puerta':'Ventana'} {i+1}</span><small>{item.width.toFixed(2)} m</small></button>)}{model.furniture.map((item,i)=><button key={item.id} className={selection?.id===item.id?'is-active':''} onClick={()=>{setSelection({collection:'furniture',id:item.id});setTool('select')}}><span>{FURNITURE[item.type]?.label} {i+1}</span><small>{item.width.toFixed(2)} m</small></button>)}</div>
    </aside></div></section>
}
