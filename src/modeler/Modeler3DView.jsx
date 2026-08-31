import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { Shape } from 'three'
import { DEFAULT_BUILDING, FLOOR_MATERIALS, FURNITURE, cameraPositionForView, detectRectangularRooms, modelFootprint, openingTransform3D, walkStartPosition, wallSolidParts } from './core'

function WalkControls({ start, onExit }) {
  const { camera, gl } = useThree(); const controlsRef = useRef(null); const keysRef = useRef(new Set()); const activatedRef = useRef(false)
  useEffect(() => {
    const controls = new PointerLockControls(camera, gl.domElement); camera.position.set(...start); camera.lookAt(start[0], start[1], start[2] - 1); controlsRef.current = controls
    const keyDown = (event) => { if (event.code === 'Escape') onExit(); else keysRef.current.add(event.code) }
    const keyUp = (event) => keysRef.current.delete(event.code)
    const lock = () => controls.lock(); const activated = () => { activatedRef.current = true }; const unlocked = () => { if (activatedRef.current) onExit() }
    document.addEventListener('keydown', keyDown); document.addEventListener('keyup', keyUp); gl.domElement.addEventListener('click', lock); controls.addEventListener('lock', activated); controls.addEventListener('unlock', unlocked)
    return () => { document.removeEventListener('keydown', keyDown); document.removeEventListener('keyup', keyUp); gl.domElement.removeEventListener('click', lock); controls.removeEventListener('lock', activated); controls.removeEventListener('unlock', unlocked); if(controls.isLocked)controls.unlock(); controls.dispose(); controlsRef.current = null }
  }, [camera, gl, onExit, start])
  useFrame((_, delta) => {
    const controls = controlsRef.current; if (!controls?.isLocked) return
    const keys = keysRef.current; const step = Math.min(delta, 0.05) * 2.4
    if (keys.has('KeyW') || keys.has('ArrowUp')) controls.moveForward(step)
    if (keys.has('KeyS') || keys.has('ArrowDown')) controls.moveForward(-step)
    if (keys.has('KeyA') || keys.has('ArrowLeft')) controls.moveRight(-step)
    if (keys.has('KeyD') || keys.has('ArrowRight')) controls.moveRight(step)
  })
  return null
}

function CameraControls({ target, position }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef(null)

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    camera.position.set(...position)
    controls.target.set(...target)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 2
    controls.maxDistance = 120
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.update()
    controlsRef.current = controls
    return () => { controls.dispose(); controlsRef.current = null }
  }, [camera, gl, position, target])

  useFrame(() => controlsRef.current?.update())
  return null
}

function WallMesh({ wall, openings, selected, onSelect }) {
  const parts = wallSolidParts(wall, openings)
  return <group>{parts.map((part) => <mesh key={part.key} position={part.position} rotation={part.rotation} castShadow receiveShadow onClick={(event) => { event.stopPropagation(); onSelect({ collection: 'walls', id: wall.id }) }}>
    <boxGeometry args={part.size} />
    <meshStandardMaterial color={selected ? '#c97752' : '#f1eadf'} roughness={0.82} />
  </mesh>)}</group>
}

function OpeningMesh({ opening, wall, selected, onSelect }) {
  const transform = openingTransform3D(opening, wall)
  const frame = 0.055; const depth = Math.max(0.09, wall.thickness + 0.035); const select = (event) => { event.stopPropagation(); onSelect({ collection: 'openings', id: opening.id }) }
  if (opening.type === 'window') {
    const glassWidth = Math.max(0.1, opening.width - frame * 2); const glassHeight = Math.max(0.1, opening.height - frame * 2)
    return <group position={transform.position} rotation={transform.rotation} onClick={select}>
      <mesh position={[-opening.width / 2 + frame / 2, 0, 0]} castShadow><boxGeometry args={[frame, opening.height, depth]} /><meshStandardMaterial color={selected ? '#ef754f' : '#6d665d'} /></mesh>
      <mesh position={[opening.width / 2 - frame / 2, 0, 0]} castShadow><boxGeometry args={[frame, opening.height, depth]} /><meshStandardMaterial color={selected ? '#ef754f' : '#6d665d'} /></mesh>
      <mesh position={[0, opening.height / 2 - frame / 2, 0]} castShadow><boxGeometry args={[glassWidth, frame, depth]} /><meshStandardMaterial color={selected ? '#ef754f' : '#6d665d'} /></mesh>
      <mesh position={[0, -opening.height / 2 + frame / 2, 0]} castShadow><boxGeometry args={[glassWidth, frame, depth]} /><meshStandardMaterial color={selected ? '#ef754f' : '#6d665d'} /></mesh>
      <mesh><boxGeometry args={[glassWidth, glassHeight, 0.018]} /><meshPhysicalMaterial color="#8fd3e3" transparent opacity={0.38} roughness={0.12} metalness={0.05} /></mesh>
    </group>
  }
  const swing = opening.swing || 'left-in'; const hingeLeft = swing.startsWith('left'); const outward = swing.endsWith('out'); const leafWidth = Math.max(0.1, opening.width - frame * 2); const leafHeight = Math.max(0.1, opening.height - frame); const hingeX = hingeLeft ? -opening.width / 2 + frame : opening.width / 2 - frame; const leafDirection = hingeLeft ? 1 : -1; const swingAngle = (hingeLeft ? -1 : 1) * (outward ? -1 : 1) * 1.05
  return <group position={transform.position} rotation={transform.rotation} onClick={select}>
    <mesh position={[-opening.width / 2 + frame / 2, 0, 0]} castShadow><boxGeometry args={[frame, opening.height, depth]} /><meshStandardMaterial color={selected ? '#ef754f' : '#594a3e'} /></mesh>
    <mesh position={[opening.width / 2 - frame / 2, 0, 0]} castShadow><boxGeometry args={[frame, opening.height, depth]} /><meshStandardMaterial color={selected ? '#ef754f' : '#594a3e'} /></mesh>
    <mesh position={[0, opening.height / 2 - frame / 2, 0]} castShadow><boxGeometry args={[opening.width, frame, depth]} /><meshStandardMaterial color={selected ? '#ef754f' : '#594a3e'} /></mesh>
    <group position={[hingeX, -frame / 2, 0]} rotation={[0, swingAngle, 0]}>
      <mesh position={[leafDirection * leafWidth / 2, 0, 0]} castShadow><boxGeometry args={[leafWidth, leafHeight, 0.04]} /><meshStandardMaterial color={selected ? '#ef754f' : '#8a654d'} roughness={0.72} /></mesh>
    </group>
  </group>
}

function FurnitureMesh({ item, selected, onSelect }) {
  const color = FURNITURE[item.type]?.color || '#a77b50'
  return <mesh position={[item.x, item.height / 2, item.y]} rotation={[0, -(item.rotation || 0), 0]} castShadow receiveShadow onClick={(event) => { event.stopPropagation(); onSelect({ collection: 'furniture', id: item.id }) }}>
    <boxGeometry args={[item.width, item.height, item.depth]} />
    <meshStandardMaterial color={selected ? '#e49a70' : color} roughness={0.75} />
  </mesh>
}

function FloorMesh({ room, thickness, selected, onSelect }) {
  const shape = useMemo(() => { const next = new Shape(); room.polygon.forEach((point, index) => index ? next.lineTo(point.x, point.y) : next.moveTo(point.x, point.y)); next.closePath(); return next }, [room.polygon])
  return <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow onClick={(event)=>{event.stopPropagation();onSelect({collection:'rooms',id:room.id})}}>
    <extrudeGeometry args={[shape,{depth:thickness,bevelEnabled:false}]} />
    <meshStandardMaterial color={selected?'#d68a62':FLOOR_MATERIALS[room.material]?.color||'#aaa49a'} roughness={0.92} />
  </mesh>
}

function BuildingSurfaces({ model, selection, onSelect }) {
  const building = model.building || DEFAULT_BUILDING
  const floor = building.floor || DEFAULT_BUILDING.floor
  const ceiling = building.ceiling || DEFAULT_BUILDING.ceiling
  const roof = building.roof || DEFAULT_BUILDING.roof
  const ceilingFootprint = modelFootprint(model)
  const roofFootprint = modelFootprint(model, roof.overhang || 0)
  const wallTop = model.walls.reduce((height, wall) => Math.max(height, wall.height), 0)
  const rooms = detectRectangularRooms(model)
  if (!ceilingFootprint) return null
  return <>
    {floor.enabled && floor.visible && rooms.map((room) => <FloorMesh key={`floor-${room.id}`} room={room} thickness={floor.thickness} selected={selection?.collection==='rooms'&&selection.id===room.id} onSelect={onSelect}/>)}
    {ceiling.enabled && ceiling.visible && <mesh position={[ceilingFootprint.x, ceiling.height, ceilingFootprint.y]} receiveShadow castShadow>
      <boxGeometry args={[ceilingFootprint.width, ceiling.thickness, ceilingFootprint.depth]} />
      <meshStandardMaterial color="#f4f1e9" roughness={0.9} transparent opacity={0.82} />
    </mesh>}
    {roof.enabled && roof.visible && <mesh position={[roofFootprint.x, wallTop + roof.thickness / 2, roofFootprint.y]} receiveShadow castShadow>
      <boxGeometry args={[roofFootprint.width, roof.thickness, roofFootprint.depth]} />
      <meshStandardMaterial color="#795b4d" roughness={0.88} />
    </mesh>}
  </>
}

export default function Modeler3DView({ model, selection, onSelect, cameraView = 'perspective', hiddenWallIds = [], walkMode = false, onExitWalk = () => {} }) {
  const bounds = useMemo(() => {
    const points = model.walls.flatMap((wall) => [wall.start, wall.end]).concat(model.furniture.map((item) => ({ x: item.x, y: item.y })))
    if (!points.length) return { x: 0, z: 0, span: 8 }
    const xs = points.map((point) => point.x); const zs = points.map((point) => point.y)
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minZ = Math.min(...zs); const maxZ = Math.max(...zs)
    return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, span: Math.max(8, maxX - minX, maxZ - minZ) }
  }, [model])
  const target = useMemo(() => [bounds.x, 1.2, bounds.z], [bounds.x, bounds.z])
  const cameraPosition = useMemo(() => cameraPositionForView(bounds, cameraView), [bounds, cameraView])
  const hiddenWalls = useMemo(() => new Set(hiddenWallIds), [hiddenWallIds])
  const walkStart = useMemo(() => walkStartPosition(model), [model])

  return <div className="modeler-three-view" aria-label="Vista tridimensional del proyecto">
    <Canvas shadows dpr={[1, 2]} camera={{ position: [bounds.x + bounds.span, bounds.span * 0.75, bounds.z + bounds.span], fov: 42, near: 0.1, far: 500 }} onPointerMissed={() => onSelect(null)}>
      <color attach="background" args={['#e8e3da']} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[8, 14, 6]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={['#fff8e8', '#756b61', 0.8]} />
      <gridHelper args={[80, 800, '#b86542', '#d4cec4']} position={[bounds.x, 0, bounds.z]} />
      {model.walls.filter((wall)=>!hiddenWalls.has(wall.id)).map((wall) => <WallMesh key={wall.id} wall={wall} openings={model.openings} selected={selection?.collection === 'walls' && selection.id === wall.id} onSelect={onSelect} />)}
      {model.openings.map((opening) => { const wall = model.walls.find((item) => item.id === opening.wallId); return wall&&!hiddenWalls.has(wall.id) ? <OpeningMesh key={opening.id} opening={opening} wall={wall} selected={selection?.collection === 'openings' && selection.id === opening.id} onSelect={onSelect} /> : null })}
      {model.furniture.map((item) => <FurnitureMesh key={item.id} item={item} selected={selection?.collection === 'furniture' && selection.id === item.id} onSelect={onSelect} />)}
      <BuildingSurfaces model={model} selection={selection} onSelect={onSelect} />
      {walkMode?<WalkControls start={walkStart} onExit={onExitWalk}/>:<CameraControls target={target} position={cameraPosition} />}
    </Canvas>
    {walkMode&&<div className="modeler-walk-help">Clic para mirar · W A S D o flechas para caminar · Esc para salir</div>}
  </div>
}
