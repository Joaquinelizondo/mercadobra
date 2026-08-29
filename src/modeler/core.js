export const GRID_SIZE = 0.25

export const EMPTY_MODEL = Object.freeze({ walls: [], openings: [], furniture: [] })

export const FURNITURE = Object.freeze({
  bed: { label: 'Cama', width: 1.6, depth: 2, height: 0.55, color: '#8da1aa' },
  sofa: { label: 'Sofá', width: 2, depth: 0.85, height: 0.8, color: '#9b806e' },
  table: { label: 'Mesa', width: 1.4, depth: 0.8, height: 0.75, color: '#a77b50' },
  chair: { label: 'Silla', width: 0.5, depth: 0.5, height: 0.9, color: '#b58b62' },
  wardrobe: { label: 'Placard', width: 1.8, depth: 0.6, height: 2.2, color: '#8d7359' },
  toilet: { label: 'Inodoro', width: 0.42, depth: 0.7, height: 0.75, color: '#d8ddd9' },
})

export function normalizeModel(model) {
  return {
    walls: Array.isArray(model?.walls) ? model.walls : [],
    openings: Array.isArray(model?.openings) ? model.openings : [],
    furniture: Array.isArray(model?.furniture) ? model.furniture : [],
  }
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
