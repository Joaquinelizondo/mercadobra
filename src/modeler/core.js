export const GRID_SIZE = 0.1
export const DOOR_SWINGS = Object.freeze(['left-in', 'right-in', 'left-out', 'right-out'])
export const ROOM_TYPES = Object.freeze(['generic', 'living', 'kitchen', 'bedroom', 'bathroom', 'dining', 'garage', 'office'])
export const FLOOR_MATERIALS = Object.freeze({
  concrete: { label: 'Hormigón', color: '#aaa49a' },
  ceramic: { label: 'Cerámica', color: '#c8b99e' },
  wood: { label: 'Madera', color: '#a87950' },
  porcelain: { label: 'Porcelanato', color: '#ddd8cf' },
})

export const DEFAULT_BUILDING = Object.freeze({
  floor: { enabled: true, visible: true, thickness: 0.12 },
  ceiling: { enabled: false, visible: true, height: 2.4, thickness: 0.05 },
  roof: { enabled: false, visible: true, thickness: 0.15, overhang: 0.25 },
})
export const EMPTY_MODEL = Object.freeze({ walls: [], openings: [], furniture: [], rooms: [], building: DEFAULT_BUILDING })

export const FURNITURE = Object.freeze({
  bed: { label: 'Cama', width: 1.6, depth: 2, height: 0.55, color: '#8da1aa' },
  sofa: { label: 'Sofá', width: 2, depth: 0.85, height: 0.8, color: '#9b806e' },
  table: { label: 'Mesa', width: 1.4, depth: 0.8, height: 0.75, color: '#a77b50' },
  chair: { label: 'Silla', width: 0.5, depth: 0.5, height: 0.9, color: '#b58b62' },
  wardrobe: { label: 'Placard', width: 1.8, depth: 0.6, height: 2.2, color: '#8d7359' },
  toilet: { label: 'Inodoro', width: 0.42, depth: 0.7, height: 0.75, color: '#d8ddd9' },
})

export function normalizeModel(model) {
  const building = model?.building || {}
  return {
    walls: Array.isArray(model?.walls) ? model.walls : [],
    openings: Array.isArray(model?.openings) ? model.openings.map((opening) => opening.type === 'door' && !DOOR_SWINGS.includes(opening.swing) ? { ...opening, swing: 'left-in' } : opening) : [],
    furniture: Array.isArray(model?.furniture) ? model.furniture : [],
    rooms: Array.isArray(model?.rooms) ? model.rooms : [],
    building: {
      floor: { ...DEFAULT_BUILDING.floor, ...(building.floor || {}) },
      ceiling: { ...DEFAULT_BUILDING.ceiling, ...(building.ceiling || {}) },
      roof: { ...DEFAULT_BUILDING.roof, ...(building.roof || {}) },
    },
  }
}

export function updateBuilding(model, section, field, value) {
  if (!['floor', 'ceiling', 'roof'].includes(section) || !['enabled', 'visible', 'height', 'thickness', 'overhang'].includes(field)) return model
  const current = model.building || DEFAULT_BUILDING
  let normalized = value
  if (field === 'enabled' || field === 'visible') normalized = Boolean(value)
  else {
    normalized = Number(value)
    if (!Number.isFinite(normalized)) return model
    const limits = field === 'height' ? [0.2, 100] : field === 'overhang' ? [0, 10] : [0.01, 5]
    normalized = Math.max(limits[0], Math.min(limits[1], normalized))
  }
  return { ...model, building: { ...current, [section]: { ...current[section], [field]: normalized } } }
}

export function detectRooms(model, tolerance = 1e-6) {
  const walls = model.walls.filter((wall) => wallLength(wall) > tolerance)
  const keyOf = (point) => `${Math.round(point.x / tolerance)}:${Math.round(point.y / tolerance)}`
  const nodes = new Map(); const edges = new Map()
  const addNode = (point) => { const key = keyOf(point); if (!nodes.has(key)) nodes.set(key, { key, x: point.x, y: point.y, neighbors: new Map() }); return nodes.get(key) }
  const intersection = (a, b) => {
    const r = { x: a.end.x - a.start.x, y: a.end.y - a.start.y }; const s = { x: b.end.x - b.start.x, y: b.end.y - b.start.y }
    const cross = r.x * s.y - r.y * s.x
    if (Math.abs(cross) <= tolerance) return null
    const q = { x: b.start.x - a.start.x, y: b.start.y - a.start.y }
    const t = (q.x * s.y - q.y * s.x) / cross; const u = (q.x * r.y - q.y * r.x) / cross
    return t >= -tolerance && t <= 1 + tolerance && u >= -tolerance && u <= 1 + tolerance ? { x: a.start.x + r.x * t, y: a.start.y + r.y * t, t, u } : null
  }
  const cuts = walls.map(() => [0, 1])
  for (let i = 0; i < walls.length; i += 1) for (let j = i + 1; j < walls.length; j += 1) {
    const hit = intersection(walls[i], walls[j]); if (!hit) continue
    cuts[i].push(Math.max(0, Math.min(1, hit.t))); cuts[j].push(Math.max(0, Math.min(1, hit.u)))
  }
  walls.forEach((wall, wallIndex) => {
    const values = [...new Set(cuts[wallIndex].sort((a, b) => a - b).map((value) => Math.round(value / tolerance) * tolerance))]
    for (let index = 0; index < values.length - 1; index += 1) {
      const start = pointOnWall(wall, values[index]); const end = pointOnWall(wall, values[index + 1]); if (Math.hypot(end.x - start.x, end.y - start.y) <= tolerance) continue
      const a = addNode(start); const b = addNode(end); a.neighbors.set(b.key, wall.id); b.neighbors.set(a.key, wall.id); edges.set(`${a.key}>${b.key}`, wall.id); edges.set(`${b.key}>${a.key}`, wall.id)
    }
  })
  const visited = new Set(); const faces = []
  for (const directed of edges.keys()) {
    if (visited.has(directed)) continue
    const [startKey, nextKey] = directed.split('>'); let previousKey = startKey; let currentKey = nextKey; const polygon = []; const wallIds = new Set(); let closed = false
    for (let guard = 0; guard <= edges.size; guard += 1) {
      const edgeKey = `${previousKey}>${currentKey}`; if (visited.has(edgeKey)) break
      visited.add(edgeKey); const current = nodes.get(currentKey); polygon.push({ x: current.x, y: current.y }); wallIds.add(edges.get(edgeKey))
      const ordered = [...current.neighbors.keys()].sort((left, right) => Math.atan2(nodes.get(left).y - current.y, nodes.get(left).x - current.x) - Math.atan2(nodes.get(right).y - current.y, nodes.get(right).x - current.x))
      const reverseIndex = ordered.indexOf(previousKey); const followingKey = ordered[(reverseIndex - 1 + ordered.length) % ordered.length]
      previousKey = currentKey; currentKey = followingKey
      if (previousKey === startKey && currentKey === nextKey) { closed = true; break }
    }
    if (!closed || polygon.length < 3) continue
    const signedArea = polygon.reduce((sum, point, index) => { const next = polygon[(index + 1) % polygon.length]; return sum + point.x * next.y - next.x * point.y }, 0) / 2
    if (signedArea <= tolerance) continue
    const perimeter = polygon.reduce((sum, point, index) => { const next = polygon[(index + 1) % polygon.length]; return sum + Math.hypot(next.x - point.x, next.y - point.y) }, 0)
    const centroidFactor = 1 / (6 * signedArea); const x = polygon.reduce((sum, point, index) => { const next = polygon[(index + 1) % polygon.length]; return sum + (point.x + next.x) * (point.x * next.y - next.x * point.y) }, 0) * centroidFactor; const y = polygon.reduce((sum, point, index) => { const next = polygon[(index + 1) % polygon.length]; return sum + (point.y + next.y) * (point.x * next.y - next.x * point.y) }, 0) * centroidFactor
    const xs = polygon.map((point) => point.x); const ys = polygon.map((point) => point.y); const ids = [...wallIds].sort(); const id = ids.join(':'); faces.push({ id, wallIds: ids, polygon, x, y, width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...ys) - Math.min(...ys), area: signedArea, perimeter })
  }
  const metadata = new Map((model.rooms || []).map((room) => [room.id, room]))
  return faces.map((room, index) => ({ name: `Ambiente ${index + 1}`, type: 'generic', material: 'concrete', ...metadata.get(room.id), ...room }))
}

export const detectRectangularRooms = detectRooms

export function pointInRoom(point, room) {
  let inside = false
  for (let index = 0, previous = room.polygon.length - 1; index < room.polygon.length; previous = index++) {
    const a = room.polygon[index]; const b = room.polygon[previous]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function updateRoom(model, roomId, field, value) {
  if (!['name', 'type', 'material'].includes(field)) return model
  if (field === 'type' && !ROOM_TYPES.includes(value)) return model
  if (field === 'material' && !FLOOR_MATERIALS[value]) return model
  const normalized = field === 'name' ? String(value).trimStart().slice(0, 80) : value
  const current = (model.rooms || []).find((room) => room.id === roomId) || { id: roomId, name: 'Ambiente', type: 'generic', material: 'concrete' }
  return { ...model, rooms: [...(model.rooms || []).filter((room) => room.id !== roomId), { ...current, [field]: normalized }] }
}

export function modelFootprint(model, padding = 0) {
  const points = model.walls.flatMap((wall) => [wall.start, wall.end])
  if (!points.length) return null
  const xs = points.map((point) => point.x); const ys = points.map((point) => point.y)
  const minX = Math.min(...xs) - padding; const maxX = Math.max(...xs) + padding
  const minY = Math.min(...ys) - padding; const maxY = Math.max(...ys) + padding
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: Math.max(0.1, maxX - minX), depth: Math.max(0.1, maxY - minY) }
}

export function cameraPositionForView(bounds, view = 'perspective') {
  const distance = Math.max(8, bounds.span) * 1.6; const elevation = 1.4
  const positions = {
    front: [bounds.x, elevation, bounds.z + distance],
    back: [bounds.x, elevation, bounds.z - distance],
    left: [bounds.x - distance, elevation, bounds.z],
    right: [bounds.x + distance, elevation, bounds.z],
    perspective: [bounds.x + bounds.span, bounds.span * 0.75, bounds.z + bounds.span],
  }
  return positions[view] || positions.perspective
}

export function walkStartPosition(model, eyeHeight = 1.65) {
  const room = detectRooms(model)[0]
  if (room) return [room.x, eyeHeight, room.y]
  const footprint = modelFootprint(model)
  return footprint ? [footprint.x, eyeHeight, footprint.y] : [0, eyeHeight, 0]
}

export function rememberModel(history, model, limit = 50) {
  return [...history.slice(-(limit - 1)), structuredClone(model)]
}

export function undoModel(history, currentModel) {
  if (!history.length) return { history, model: currentModel, changed: false }
  return { history: history.slice(0, -1), model: structuredClone(history.at(-1)), changed: true }
}

export function snap(value, gridSize = GRID_SIZE) {
  const snapped = Math.round(value / gridSize) * gridSize
  return Object.is(snapped, -0) ? 0 : snapped
}

export function wallLength(wall) {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
}

export function wallTransform3D(wall) {
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  return {
    position: [(wall.start.x + wall.end.x) / 2, wall.height / 2, (wall.start.y + wall.end.y) / 2],
    rotation: [0, -Math.atan2(dy, dx), 0],
    size: [Math.hypot(dx, dy), wall.height, wall.thickness],
  }
}

export function openingTransform3D(opening, wall) {
  const center = pointOnWall(wall, opening.t)
  const angle = -Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
  return {
    position: [center.x, opening.sill + opening.height / 2, center.y],
    rotation: [0, angle, 0],
    size: [opening.width, opening.height, opening.type === 'window' ? 0.025 : 0.04],
  }
}

export function wallSolidParts(wall, openings = []) {
  const length = wallLength(wall)
  if (length <= 0) return []
  const dx = (wall.end.x - wall.start.x) / length
  const dy = (wall.end.y - wall.start.y) / length
  const rotation = [0, -Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x), 0]
  const wallOpenings = openings
    .filter((opening) => opening.wallId === wall.id)
    .map((opening) => ({ ...opening, start: opening.t * length - opening.width / 2, end: opening.t * length + opening.width / 2 }))
    .sort((a, b) => a.start - b.start)

  const parts = []
  const addPart = (start, end, bottom, top, kind) => {
    const width = end - start; const height = top - bottom
    if (width <= 1e-9 || height <= 1e-9) return
    const distance = (start + end) / 2
    parts.push({
      key: `${wall.id}-${kind}-${parts.length}`,
      kind,
      position: [wall.start.x + dx * distance, bottom + height / 2, wall.start.y + dy * distance],
      rotation,
      size: [width, height, wall.thickness],
    })
  }

  let cursor = 0
  for (const opening of wallOpenings) {
    addPart(cursor, opening.start, 0, wall.height, 'pier')
    addPart(opening.start, opening.end, 0, opening.sill, 'sill')
    addPart(opening.start, opening.end, opening.sill + opening.height, wall.height, 'lintel')
    cursor = opening.end
  }
  addPart(cursor, length, 0, wall.height, 'pier')
  return parts
}

export function pointOnWall(wall, t) {
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    y: wall.start.y + (wall.end.y - wall.start.y) * t,
  }
}

export function constrainOrthogonal(origin, point) {
  const dx = point.x - origin.x
  const dy = point.y - origin.y
  return Math.abs(dx) >= Math.abs(dy)
    ? { x: point.x, y: origin.y }
    : { x: origin.x, y: point.y }
}

export function segmentHit(point, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const squared = dx * dx + dy * dy
  const t = squared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / squared)) : 0
  return { distance: Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy), t }
}

export function appendWall(model, wall) {
  return { ...model, walls: [...model.walls, wall] }
}

export function updateWall(model, wallId, field, value) {
  const limits = { height: [0.1, 100], thickness: [0.01, 10] }
  const range = limits[field]
  const number = Number(value)
  if (!range || !Number.isFinite(number)) return model
  const normalized = Math.max(range[0], Math.min(range[1], number))
  return {
    ...model,
    walls: model.walls.map((wall) => wall.id === wallId ? { ...wall, [field]: normalized } : wall),
  }
}

export function setWallLength(model, wallId, value) {
  const length = Math.max(0.1, Math.min(10000, Number(value)))
  if (!Number.isFinite(length)) return model
  return {
    ...model,
    walls: model.walls.map((wall) => {
      if (wall.id !== wallId) return wall
      const currentLength = wallLength(wall)
      const direction = currentLength
        ? { x: (wall.end.x - wall.start.x) / currentLength, y: (wall.end.y - wall.start.y) / currentLength }
        : { x: 1, y: 0 }
      return { ...wall, end: { x: wall.start.x + direction.x * length, y: wall.start.y + direction.y * length } }
    }),
  }
}

export function moveWallEndpoint(model, wallId, endpoint, point) {
  if (!['start', 'end'].includes(endpoint) || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return model
  return {
    ...model,
    walls: model.walls.map((wall) => wall.id === wallId ? { ...wall, [endpoint]: { x: point.x, y: point.y } } : wall),
  }
}

function openingPositionBounds(wall, width) {
  const length = wallLength(wall)
  if (length <= 0) return { min: 0.5, max: 0.5 }
  const margin = Math.min(0.5, width / (2 * length))
  return { min: margin, max: 1 - margin }
}

export function validateOpeningPlacement(model, candidate, excludedOpeningId = candidate?.id) {
  const wall = model.walls.find((item) => item.id === candidate?.wallId)
  if (!wall) return { valid: false, reason: 'La abertura debe pertenecer a un muro existente.' }
  const length = wallLength(wall)
  if (!Number.isFinite(candidate.width) || candidate.width < 0.2 || candidate.width > length) return { valid: false, reason: 'El ancho de la abertura supera el largo disponible del muro.' }
  if (!Number.isFinite(candidate.height) || candidate.height < 0.2 || !Number.isFinite(candidate.sill) || candidate.sill < 0 || candidate.sill + candidate.height > wall.height) return { valid: false, reason: 'La altura y el antepecho deben quedar dentro de la altura del muro.' }
  const bounds = openingPositionBounds(wall, candidate.width)
  if (!Number.isFinite(candidate.t) || candidate.t < bounds.min || candidate.t > bounds.max) return { valid: false, reason: 'La abertura debe quedar completamente dentro del muro.' }
  const start = candidate.t - candidate.width / (2 * length)
  const end = candidate.t + candidate.width / (2 * length)
  const overlaps = model.openings.some((opening) => {
    if (opening.id === excludedOpeningId || opening.wallId !== candidate.wallId) return false
    const otherStart = opening.t - opening.width / (2 * length)
    const otherEnd = opening.t + opening.width / (2 * length)
    return start < otherEnd - 1e-9 && end > otherStart + 1e-9
  })
  return overlaps ? { valid: false, reason: 'La abertura se superpone con otra abertura del mismo muro.' } : { valid: true, reason: '' }
}

export function findOpeningPlacement(model, opening, preferredWallIndex = 0) {
  if (!model.walls.length) return null
  const startIndex = Math.max(0, Math.min(model.walls.length - 1, Number(preferredWallIndex) || 0))
  const walls = [...model.walls.slice(startIndex), ...model.walls.slice(0, startIndex)]
  for (const wall of walls) {
    const bounds = openingPositionBounds(wall, opening.width)
    const preferred = Math.max(bounds.min, Math.min(bounds.max, Number(opening.t) || 0.5))
    const positions = Array.from({ length: 41 }, (_, index) => bounds.min + (bounds.max - bounds.min) * index / 40)
      .concat(preferred)
      .sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred))
    for (const t of positions) {
      const candidate = { ...opening, wallId: wall.id, t }
      if (validateOpeningPlacement(model, candidate).valid) return candidate
    }
  }
  return null
}

export function moveOpening(model, openingId, position) {
  const number = Number(position)
  if (!Number.isFinite(number)) return model
  return {
    ...model,
    openings: model.openings.map((opening) => {
      if (opening.id !== openingId) return opening
      const wall = model.walls.find((item) => item.id === opening.wallId)
      if (!wall) return opening
      const bounds = openingPositionBounds(wall, opening.width)
      const candidate = { ...opening, t: Math.max(bounds.min, Math.min(bounds.max, number)) }
      return validateOpeningPlacement(model, candidate, opening.id).valid ? candidate : opening
    }),
  }
}

export function updateOpening(model, openingId, field, value) {
  const limits = { width: [0.2, 20], height: [0.2, 20], sill: [0, 20] }
  const range = limits[field]
  const number = Number(value)
  if (!range || !Number.isFinite(number)) return model
  return {
    ...model,
    openings: model.openings.map((opening) => {
      if (opening.id !== openingId) return opening
      const wall = model.walls.find((item) => item.id === opening.wallId)
      let maximum = field === 'width' && wall ? Math.min(range[1], wallLength(wall)) : range[1]
      if (field === 'height' && wall) maximum = Math.min(maximum, wall.height - opening.sill)
      if (field === 'sill' && wall) maximum = Math.min(maximum, wall.height - opening.height)
      if (maximum < range[0]) return opening
      const normalized = Math.max(range[0], Math.min(maximum, number))
      const next = { ...opening, [field]: normalized }
      if (field === 'width' && wall) {
        const bounds = openingPositionBounds(wall, normalized)
        next.t = Math.max(bounds.min, Math.min(bounds.max, opening.t))
      }
      return validateOpeningPlacement(model, next, opening.id).valid ? next : opening
    }),
  }
}

export function updateDoorSwing(model, openingId, swing) {
  if (!DOOR_SWINGS.includes(swing)) return model
  return {
    ...model,
    openings: model.openings.map((opening) => opening.id === openingId && opening.type === 'door' ? { ...opening, swing } : opening),
  }
}

export function deleteElement(model, selection) {
  if (!selection || !Array.isArray(model[selection.collection])) return model
  const next = { ...model, [selection.collection]: model[selection.collection].filter((item) => item.id !== selection.id) }
  if (selection.collection === 'walls') next.openings = model.openings.filter((item) => item.wallId !== selection.id)
  return next
}

export function rotateFurniture(model, furnitureId, angle = Math.PI / 2) {
  return {
    ...model,
    furniture: model.furniture.map((item) => item.id === furnitureId ? { ...item, rotation: (item.rotation || 0) + angle } : item),
  }
}

export function updateFurniture(model, furnitureId, field, value) {
  const limits = { width: [0.1, 100], depth: [0.1, 100], height: [0.1, 100], x: [-10000, 10000], y: [-10000, 10000], rotation: [-360, 360] }
  const range = limits[field]
  const number = Number(value)
  if (!range || !Number.isFinite(number)) return model
  const normalized = Math.max(range[0], Math.min(range[1], number))
  return {
    ...model,
    furniture: model.furniture.map((item) => item.id === furnitureId
      ? { ...item, [field]: field === 'rotation' ? normalized * Math.PI / 180 : normalized }
      : item),
  }
}
