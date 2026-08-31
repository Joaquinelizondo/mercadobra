import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendWall,
  cameraPositionForView,
  constrainOrthogonal,
  deleteElement,
  detectRectangularRooms,
  detectRooms,
  findOpeningPlacement,
  modelFootprint,
  normalizeModel,
  openingTransform3D,
  moveWallEndpoint,
  moveOpening,
  pointOnWall,
  pointInRoom,
  rememberModel,
  rotateFurniture,
  segmentHit,
  snap,
  setWallLength,
  updateFurniture,
  updateBuilding,
  updateDoorSwing,
  updateOpening,
  updateRoom,
  updateWall,
  undoModel,
  validateOpeningPlacement,
  wallLength,
  wallSolidParts,
  wallTransform3D,
} from './core.js'

const wall = { id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 4, y: 3 }, height: 2.7, thickness: 0.15 }

test('normaliza documentos incompletos', () => {
  const model = normalizeModel({ walls: [wall] })
  assert.deepEqual(model.walls, [wall])
  assert.deepEqual(model.openings, [])
  assert.deepEqual(model.furniture, [])
  assert.deepEqual(model.rooms, [])
  assert.equal(model.building.floor.enabled, true)
  assert.equal(model.building.ceiling.enabled, false)
  assert.equal(model.building.roof.overhang, 0.25)
})

test('normaliza y edita el sentido de apertura de una puerta', () => {
  const door = { id: 'door-1', type: 'door', wallId: wall.id, t: 0.5, width: 0.9, height: 2.1, sill: 0 }
  const model = normalizeModel({ walls: [wall], openings: [door], furniture: [] })
  assert.equal(model.openings[0].swing, 'left-in')
  assert.equal(updateDoorSwing(model, door.id, 'right-out').openings[0].swing, 'right-out')
  assert.equal(updateDoorSwing(model, door.id, 'invalid').openings[0].swing, 'left-in')
})

test('conserva hasta 50 estados independientes en el historial', () => {
  let history = []
  for (let index = 0; index < 55; index += 1) history = rememberModel(history, { walls: [{ id: String(index) }], openings: [], furniture: [] })
  assert.equal(history.length, 50)
  assert.equal(history[0].walls[0].id, '5')
  history.at(-1).walls[0].id = 'changed'
  assert.equal(history.at(-2).walls[0].id, '53')
})

test('deshace el último estado sin mutar el historial', () => {
  const previous = { walls: [wall], openings: [], furniture: [] }
  const history = rememberModel([], previous)
  const current = { walls: [], openings: [], furniture: [] }
  const result = undoModel(history, current)
  assert.equal(result.changed, true)
  assert.deepEqual(result.model, previous)
  assert.equal(result.history.length, 0)
  assert.equal(history.length, 1)
})

test('ajusta coordenadas a la rejilla de 10 cm', () => {
  assert.equal(snap(1.13), 1.1)
  assert.equal(snap(-0.06), -0.1)
})

test('calcula la huella y permite configurar cielorraso y techo', () => {
  const base = normalizeModel({ walls: [wall] })
  assert.deepEqual(modelFootprint(base), { x: 2, y: 1.5, width: 4, depth: 3 })
  const ceiling = updateBuilding(base, 'ceiling', 'enabled', true)
  const roof = updateBuilding(ceiling, 'roof', 'overhang', 0.5)
  assert.equal(ceiling.building.ceiling.enabled, true)
  assert.equal(roof.building.roof.overhang, 0.5)
  assert.deepEqual(modelFootprint(roof, roof.building.roof.overhang), { x: 2, y: 1.5, width: 5, depth: 4 })
})

test('calcula posiciones de cámara para vistas estándar', () => {
  const bounds = { x: 2, z: 3, span: 10 }
  assert.deepEqual(cameraPositionForView(bounds, 'front'), [2, 1.4, 19])
  assert.deepEqual(cameraPositionForView(bounds, 'back'), [2, 1.4, -13])
  assert.deepEqual(cameraPositionForView(bounds, 'left'), [-14, 1.4, 3])
  assert.deepEqual(cameraPositionForView(bounds, 'right'), [18, 1.4, 3])
  assert.deepEqual(cameraPositionForView(bounds, 'perspective'), [12, 7.5, 13])
})

test('detecta un ambiente rectangular cerrado y calcula su piso', () => {
  const walls = [
    { ...wall, id: 'bottom', start: { x: 0, y: 0 }, end: { x: 4, y: 0 } },
    { ...wall, id: 'right', start: { x: 4, y: 0 }, end: { x: 4, y: 3 } },
    { ...wall, id: 'top', start: { x: 4, y: 3 }, end: { x: 0, y: 3 } },
    { ...wall, id: 'left', start: { x: 0, y: 3 }, end: { x: 0, y: 0 } },
  ]
  const rooms = detectRectangularRooms({ walls })
  assert.equal(rooms.length, 1)
  assert.deepEqual({ x: rooms[0].x, y: rooms[0].y, width: rooms[0].width, depth: rooms[0].depth, area: rooms[0].area, perimeter: rooms[0].perimeter }, { x: 2, y: 1.5, width: 4, depth: 3, area: 12, perimeter: 14 })
  assert.equal(detectRectangularRooms({ walls: walls.slice(0, 3) }).length, 0)
})

test('conserva nombre, tipo y material de un ambiente al cambiar sus medidas', () => {
  const walls = [
    { ...wall, id: 'bottom', start: { x: 0, y: 0 }, end: { x: 4, y: 0 } },
    { ...wall, id: 'right', start: { x: 4, y: 0 }, end: { x: 4, y: 3 } },
    { ...wall, id: 'top', start: { x: 4, y: 3 }, end: { x: 0, y: 3 } },
    { ...wall, id: 'left', start: { x: 0, y: 3 }, end: { x: 0, y: 0 } },
  ]
  let model = normalizeModel({ walls })
  const roomId = detectRectangularRooms(model)[0].id
  model = updateRoom(model, roomId, 'name', 'Cocina')
  model = updateRoom(model, roomId, 'type', 'kitchen')
  model = updateRoom(model, roomId, 'material', 'ceramic')
  const resized = { ...model, walls: model.walls.map((item) => item.id === 'right' ? { ...item, start: { x: 5, y: 0 }, end: { x: 5, y: 3 } } : item.id === 'bottom' || item.id === 'top' ? { ...item, start: { ...item.start, x: item.start.x === 4 ? 5 : item.start.x }, end: { ...item.end, x: item.end.x === 4 ? 5 : item.end.x } } : item) }
  const room = detectRectangularRooms(resized)[0]
  assert.equal(room.name, 'Cocina')
  assert.equal(room.type, 'kitchen')
  assert.equal(room.material, 'ceramic')
  assert.equal(room.area, 15)
})

test('detecta una planta irregular en L y permite seleccionar su interior', () => {
  const points = [{x:0,y:0},{x:4,y:0},{x:4,y:2},{x:2,y:2},{x:2,y:4},{x:0,y:4}]
  const walls = points.map((start,index)=>({ ...wall, id:`l-${index}`, start, end:points[(index+1)%points.length] }))
  const rooms = detectRooms({ walls, rooms: [] })
  assert.equal(rooms.length, 1)
  assert.equal(rooms[0].area, 12)
  assert.equal(rooms[0].perimeter, 16)
  assert.equal(pointInRoom({x:1,y:3},rooms[0]), true)
  assert.equal(pointInRoom({x:3,y:3},rooms[0]), false)
})

test('divide una planta en dos ambientes mediante un muro interior', () => {
  const walls = [
    { ...wall, id:'bottom', start:{x:0,y:0}, end:{x:6,y:0} },
    { ...wall, id:'right', start:{x:6,y:0}, end:{x:6,y:3} },
    { ...wall, id:'top', start:{x:6,y:3}, end:{x:0,y:3} },
    { ...wall, id:'left', start:{x:0,y:3}, end:{x:0,y:0} },
    { ...wall, id:'divider', start:{x:3,y:0}, end:{x:3,y:3} },
  ]
  const rooms = detectRooms({ walls, rooms: [] })
  assert.equal(rooms.length, 2)
  assert.deepEqual(rooms.map((room)=>room.area).sort((a,b)=>a-b),[9,9])
})

test('calcula longitud y puntos sobre un muro', () => {
  assert.equal(wallLength(wall), 5)
  assert.deepEqual(pointOnWall(wall, 0.5), { x: 2, y: 1.5 })
})

test('convierte muros y aberturas al sistema de coordenadas 3D', () => {
  const wallTransform = wallTransform3D(wall)
  assert.deepEqual(wallTransform.position, [2, 1.35, 1.5])
  assert.deepEqual(wallTransform.size, [5, 2.7, 0.15])
  assert.ok(Math.abs(wallTransform.rotation[1] + Math.atan2(3, 4)) < 1e-9)
  const opening = { wallId: wall.id, t: 0.5, width: 1, height: 1.2, sill: 0.9 }
  assert.deepEqual(openingTransform3D(opening, wall).position, [2, 1.5, 1.5])
})

test('divide un muro alrededor de una puerta y conserva el volumen correcto', () => {
  const horizontalWall = { ...wall, end: { x: 4, y: 0 } }
  const door = { id: 'door-1', type: 'door', wallId: wall.id, t: 0.5, width: 0.9, height: 2.1, sill: 0 }
  const parts = wallSolidParts(horizontalWall, [door])
  assert.equal(parts.length, 3)
  assert.deepEqual(parts.map((part) => part.kind), ['pier', 'lintel', 'pier'])
  const volume = parts.reduce((sum, part) => sum + part.size[0] * part.size[1] * part.size[2], 0)
  const expected = (4 * 2.7 - 0.9 * 2.1) * 0.15
  assert.ok(Math.abs(volume - expected) < 1e-9)
})

test('genera antepecho y dintel alrededor de una ventana', () => {
  const horizontalWall = { ...wall, end: { x: 4, y: 0 } }
  const window = { id: 'window-1', type: 'window', wallId: wall.id, t: 0.5, width: 1.2, height: 1, sill: 0.9 }
  const parts = wallSolidParts(horizontalWall, [window])
  assert.deepEqual(parts.map((part) => part.kind), ['pier', 'sill', 'lintel', 'pier'])
  assert.equal(parts.find((part) => part.kind === 'sill').size[1], 0.9)
})

test('restringe un punto al eje dominante respecto del origen', () => {
  assert.deepEqual(constrainOrthogonal({ x: 1, y: 1 }, { x: 4, y: 2 }), { x: 4, y: 1 })
  assert.deepEqual(constrainOrthogonal({ x: 1, y: 1 }, { x: 2, y: 5 }), { x: 1, y: 5 })
})

test('calcula la distancia y posición relativa al segmento', () => {
  assert.deepEqual(segmentHit({ x: 2, y: 1 }, { x: 0, y: 0 }, { x: 4, y: 0 }), { distance: 1, t: 0.5 })
})

test('agrega muros sin mutar el modelo original', () => {
  const model = { walls: [], openings: [], furniture: [] }
  const next = appendWall(model, wall)
  assert.equal(model.walls.length, 0)
  assert.deepEqual(next.walls, [wall])
})

test('edita medidas y limita valores de muros', () => {
  const model = { walls: [wall], openings: [], furniture: [] }
  const taller = updateWall(model, wall.id, 'height', 3.2)
  const thicker = updateWall(taller, wall.id, 'thickness', 20)
  assert.equal(taller.walls[0].height, 3.2)
  assert.equal(thicker.walls[0].thickness, 10)
  assert.equal(model.walls[0].height, 2.7)
})

test('cambia la longitud conservando inicio y dirección', () => {
  const model = { walls: [wall], openings: [], furniture: [] }
  const next = setWallLength(model, wall.id, 10)
  assert.deepEqual(next.walls[0].start, wall.start)
  assert.deepEqual(next.walls[0].end, { x: 8, y: 6 })
  assert.equal(wallLength(next.walls[0]), 10)
})

test('mueve un extremo sin perder aberturas vinculadas', () => {
  const opening = { id: 'door-1', wallId: wall.id, t: 0.5 }
  const model = { walls: [wall], openings: [opening], furniture: [] }
  const next = moveWallEndpoint(model, wall.id, 'end', { x: 5, y: 0 })
  assert.deepEqual(next.walls[0].end, { x: 5, y: 0 })
  assert.equal(next.openings[0], opening)
})

test('limita una abertura para que permanezca dentro de su muro', () => {
  const horizontalWall = { ...wall, end: { x: 4, y: 0 } }
  const opening = { id: 'door-1', wallId: wall.id, t: 0.5, width: 1, height: 2.1, sill: 0 }
  const model = { walls: [horizontalWall], openings: [opening], furniture: [] }
  assert.equal(moveOpening(model, opening.id, 0).openings[0].t, 0.125)
  assert.equal(moveOpening(model, opening.id, 1).openings[0].t, 0.875)
})

test('edita dimensiones y reajusta la posición de una abertura', () => {
  const horizontalWall = { ...wall, end: { x: 4, y: 0 } }
  const opening = { id: 'window-1', wallId: wall.id, t: 0.1, width: 0.5, height: 1.1, sill: 0.9 }
  const model = { walls: [horizontalWall], openings: [opening], furniture: [] }
  const wider = updateOpening(model, opening.id, 'width', 2)
  const taller = updateOpening(wider, opening.id, 'height', 1.5)
  assert.equal(wider.openings[0].width, 2)
  assert.equal(wider.openings[0].t, 0.25)
  assert.equal(taller.openings[0].height, 1.5)
  assert.equal(model.openings[0].width, 0.5)
})

test('rechaza aberturas solapadas en un mismo muro', () => {
  const horizontalWall = { ...wall, end: { x: 4, y: 0 } }
  const existing = { id: 'door-1', wallId: wall.id, t: 0.25, width: 1, height: 2.1, sill: 0 }
  const candidate = { id: 'window-1', wallId: wall.id, t: 0.4, width: 1, height: 1, sill: 1 }
  const model = { walls: [horizontalWall], openings: [existing], furniture: [] }
  const validation = validateOpeningPlacement(model, candidate)
  assert.equal(validation.valid, false)
  assert.match(validation.reason, /superpone/)
})

test('permite aberturas contiguas que no se solapan', () => {
  const horizontalWall = { ...wall, end: { x: 4, y: 0 } }
  const existing = { id: 'door-1', wallId: wall.id, t: 0.25, width: 1, height: 2.1, sill: 0 }
  const candidate = { id: 'window-1', wallId: wall.id, t: 0.5, width: 1, height: 1, sill: 1 }
  const model = { walls: [horizontalWall], openings: [existing], furniture: [] }
  assert.equal(validateOpeningPlacement(model, candidate).valid, true)
})

test('busca una posición libre para una segunda abertura generada por el agente', () => {
  const horizontalWall = { ...wall, end: { x: 4, y: 0 } }
  const door = { id: 'door-1', type: 'door', wallId: wall.id, t: 0.5, width: 0.9, height: 2.1, sill: 0 }
  const window = { id: 'window-1', type: 'window', wallId: wall.id, t: 0.5, width: 1.2, height: 1, sill: 1 }
  const model = { walls: [horizontalWall], openings: [door], furniture: [] }
  const placement = findOpeningPlacement(model, window, 0)
  assert.ok(placement)
  assert.notEqual(placement.t, 0.5)
  assert.equal(validateOpeningPlacement(model, placement).valid, true)
})

test('prueba otros muros cuando el preferido no tiene espacio', () => {
  const firstWall = { ...wall, id: 'wall-1', end: { x: 1, y: 0 } }
  const secondWall = { ...wall, id: 'wall-2', start: { x: 0, y: 2 }, end: { x: 4, y: 2 } }
  const door = { id: 'door-1', type: 'door', wallId: firstWall.id, t: 0.5, width: 1, height: 2.1, sill: 0 }
  const window = { id: 'window-1', type: 'window', wallId: firstWall.id, t: 0.5, width: 1.2, height: 1, sill: 1 }
  const model = { walls: [firstWall, secondWall], openings: [door], furniture: [] }
  assert.equal(findOpeningPlacement(model, window, 0)?.wallId, secondWall.id)
})

test('impide mover una abertura encima de otra', () => {
  const horizontalWall = { ...wall, end: { x: 4, y: 0 } }
  const first = { id: 'door-1', wallId: wall.id, t: 0.25, width: 1, height: 2.1, sill: 0 }
  const second = { id: 'window-1', wallId: wall.id, t: 0.75, width: 1, height: 1, sill: 1 }
  const model = { walls: [horizontalWall], openings: [first, second], furniture: [] }
  assert.equal(moveOpening(model, second.id, 0.3).openings[1].t, 0.75)
})

test('limita altura y antepecho a la altura del muro', () => {
  const opening = { id: 'window-1', wallId: wall.id, t: 0.5, width: 1, height: 1, sill: 1 }
  const model = { walls: [wall], openings: [opening], furniture: [] }
  const taller = updateOpening(model, opening.id, 'height', 10)
  const raised = updateOpening(taller, opening.id, 'sill', 10)
  assert.ok(Math.abs(taller.openings[0].height - 1.7) < 1e-9)
  assert.equal(raised.openings[0].sill, 1)
})

test('eliminar un muro elimina también sus aberturas', () => {
  const model = { walls: [wall], openings: [{ id: 'door-1', wallId: wall.id }], furniture: [] }
  const next = deleteElement(model, { collection: 'walls', id: wall.id })
  assert.deepEqual(next.walls, [])
  assert.deepEqual(next.openings, [])
})

test('rota y limita dimensiones de muebles', () => {
  const model = { walls: [], openings: [], furniture: [{ id: 'chair-1', width: 0.5, rotation: 0 }] }
  const rotated = rotateFurniture(model, 'chair-1')
  const resized = updateFurniture(rotated, 'chair-1', 'width', 200)
  assert.equal(rotated.furniture[0].rotation, Math.PI / 2)
  assert.equal(resized.furniture[0].width, 100)
  assert.equal(model.furniture[0].rotation, 0)
})
