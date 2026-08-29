import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { FURNITURE, openingTransform3D, wallSolidParts } from './core'

function CameraControls({ target }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef(null)

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controls.target.set(...target)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 2
    controls.maxDistance = 120
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.update()
    controlsRef.current = controls
    return () => { controls.dispose(); controlsRef.current = null }
  }, [camera, gl, target])

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
  return <mesh position={transform.position} rotation={transform.rotation} onClick={(event) => { event.stopPropagation(); onSelect({ collection: 'openings', id: opening.id }) }}>
    <boxGeometry args={transform.size} />
    <meshStandardMaterial color={selected ? '#ef754f' : opening.type === 'door' ? '#79553f' : '#69afc1'} transparent opacity={opening.type === 'window' ? 0.72 : 1} />
  </mesh>
}

function FurnitureMesh({ item, selected, onSelect }) {
  const color = FURNITURE[item.type]?.color || '#a77b50'
  return <mesh position={[item.x, item.height / 2, item.y]} rotation={[0, -(item.rotation || 0), 0]} castShadow receiveShadow onClick={(event) => { event.stopPropagation(); onSelect({ collection: 'furniture', id: item.id }) }}>
    <boxGeometry args={[item.width, item.height, item.depth]} />
    <meshStandardMaterial color={selected ? '#e49a70' : color} roughness={0.75} />
  </mesh>
}

export default function Modeler3DView({ model, selection, onSelect }) {
  const bounds = useMemo(() => {
    const points = model.walls.flatMap((wall) => [wall.start, wall.end]).concat(model.furniture.map((item) => ({ x: item.x, y: item.y })))
    if (!points.length) return { x: 0, z: 0, span: 8 }
    const xs = points.map((point) => point.x); const zs = points.map((point) => point.y)
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minZ = Math.min(...zs); const maxZ = Math.max(...zs)
    return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, span: Math.max(8, maxX - minX, maxZ - minZ) }
  }, [model])
  const target = useMemo(() => [bounds.x, 1.2, bounds.z], [bounds.x, bounds.z])

  return <div className="modeler-three-view" aria-label="Vista tridimensional del proyecto">
    <Canvas shadows dpr={[1, 2]} camera={{ position: [bounds.x + bounds.span, bounds.span * 0.75, bounds.z + bounds.span], fov: 42, near: 0.1, far: 500 }} onPointerMissed={() => onSelect(null)}>
      <color attach="background" args={['#e8e3da']} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[8, 14, 6]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={['#fff8e8', '#756b61', 0.8]} />
      <gridHelper args={[80, 80, '#b86542', '#cbc4b9']} position={[bounds.x, 0, bounds.z]} />
      {model.walls.map((wall) => <WallMesh key={wall.id} wall={wall} openings={model.openings} selected={selection?.collection === 'walls' && selection.id === wall.id} onSelect={onSelect} />)}
      {model.openings.map((opening) => { const wall = model.walls.find((item) => item.id === opening.wallId); return wall ? <OpeningMesh key={opening.id} opening={opening} wall={wall} selected={selection?.collection === 'openings' && selection.id === opening.id} onSelect={onSelect} /> : null })}
      {model.furniture.map((item) => <FurnitureMesh key={item.id} item={item} selected={selection?.collection === 'furniture' && selection.id === item.id} onSelect={onSelect} />)}
      <CameraControls target={target} />
    </Canvas>
  </div>
}
