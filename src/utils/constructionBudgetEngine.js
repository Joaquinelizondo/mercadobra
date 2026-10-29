/**
 * constructionBudgetEngine.js
 * Motor de Presupuesto, Desglose de Partidas y Vinculación de Materiales con Tareas de Obra.
 * Principio rector: Agnosticismo de país, soporte multi-moneda y unidades internacionales (m², m³, ml, kg, un, gl).
 */

export const DEFAULT_BUDGET_ITEMS = [
  {
    id: 'item_01_01',
    code: '01.01',
    rubroId: 'fundaciones',
    rubroName: '01. Movimiento de Suelos & Fundaciones',
    name: 'Excavación masiva y zanjas para cimentación',
    unit: 'm³',
    quantity: 180,
    unitMaterialCost: 650,
    totalMaterialCost: 117000,
    totalLaborCost: 160000,
    totalSubcontractCost: 0,
    totalBudget: 277000
  },
  {
    id: 'item_01_02',
    code: '01.02',
    rubroId: 'fundaciones',
    rubroName: '01. Movimiento de Suelos & Fundaciones',
    name: 'Hormigón de limpieza y zapatas armadas H25',
    unit: 'm³',
    quantity: 65,
    unitMaterialCost: 7200,
    totalMaterialCost: 468000,
    totalLaborCost: 240000,
    totalSubcontractCost: 0,
    totalBudget: 708000
  },
  {
    id: 'item_02_01',
    code: '02.01',
    rubroId: 'estructura',
    rubroName: '02. Estructura de Hormigón Armado',
    name: 'Pilares y vigas de hormigón visto elaborado',
    unit: 'm³',
    quantity: 110,
    unitMaterialCost: 8500,
    totalMaterialCost: 935000,
    totalLaborCost: 500000,
    totalSubcontractCost: 0,
    totalBudget: 1435000
  },
  {
    id: 'item_02_02',
    code: '02.02',
    rubroId: 'estructura',
    rubroName: '02. Estructura de Hormigón Armado',
    name: 'Losa colaborante pretensada y bovedillas',
    unit: 'm²',
    quantity: 320,
    unitMaterialCost: 1350,
    totalMaterialCost: 432000,
    totalLaborCost: 350000,
    totalSubcontractCost: 0,
    totalBudget: 782000
  },
  {
    id: 'item_03_01',
    code: '03.01',
    rubroId: 'herreria',
    rubroName: '03. Herrería de Obra & Estructuras (Óxida)',
    name: 'Estructura metálica tubular y perfiles UPN de fachada',
    unit: 'kg',
    quantity: 3800,
    unitMaterialCost: 180,
    totalMaterialCost: 684000,
    totalLaborCost: 220000,
    totalSubcontractCost: 150000,
    totalBudget: 1054000
  },
  {
    id: 'item_04_01',
    code: '04.01',
    rubroId: 'madera',
    rubroName: '04. Carpintería en Madera & Encofrados',
    name: 'Tableros fenólicos de 18mm y puntales de soporte',
    unit: 'm²',
    quantity: 260,
    unitMaterialCost: 950,
    totalMaterialCost: 247000,
    totalLaborCost: 210000,
    totalSubcontractCost: 0,
    totalBudget: 457000
  },
  {
    id: 'item_05_01',
    code: '05.01',
    rubroId: 'albanileria',
    rubroName: '05. Albañilería y Mampostería',
    name: 'Muro ticholo cerámico 17x25x20 asentado con arena y portland',
    unit: 'm²',
    quantity: 450,
    unitMaterialCost: 420,
    totalMaterialCost: 189000,
    totalLaborCost: 230000,
    totalSubcontractCost: 0,
    totalBudget: 419000
  },
  {
    id: 'item_05_02',
    code: '05.02',
    rubroId: 'albanileria',
    rubroName: '05. Albañilería y Mampostería',
    name: 'Revoque grueso fratachado y fino interior a la cal',
    unit: 'm²',
    quantity: 680,
    unitMaterialCost: 280,
    totalMaterialCost: 190400,
    totalLaborCost: 220000,
    totalSubcontractCost: 0,
    totalBudget: 410400
  },
  {
    id: 'item_06_01',
    code: '06.01',
    rubroId: 'instalaciones',
    rubroName: '06. Instalaciones (Eléctrica, Sanitaria, HVAC)',
    name: 'Canalizaciones corrugadas, tableros y cables antillama',
    unit: 'gl',
    quantity: 1,
    unitMaterialCost: 380000,
    totalMaterialCost: 380000,
    totalLaborCost: 260000,
    totalSubcontractCost: 0,
    totalBudget: 640000
  },
  {
    id: 'item_07_01',
    code: '07.01',
    rubroId: 'terminaciones',
    rubroName: '07. Terminaciones, Revestimientos y Pintura',
    name: 'Pintura látex acrílico lavable 3 manos',
    unit: 'm²',
    quantity: 920,
    unitMaterialCost: 190,
    totalMaterialCost: 174800,
    totalLaborCost: 190000,
    totalSubcontractCost: 0,
    totalBudget: 364800
  }
]

/**
 * Limpia un valor de moneda o número de una celda de Excel/CSV
 */
export function cleanNumericValue(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0
  if (!val) return 0
  let clean = String(val).trim()
  // Eliminar signos monetarios, letras y espacios
  clean = clean.replace(/[$€R£\sUSDuy]/gi, '')
  if (!clean) return 0

  // Si tiene ambos separadores (ej. "1.234,56" o "1,234.56")
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.lastIndexOf('.') < clean.lastIndexOf(',')) {
      // 1.234,56 -> miles con punto, decimal con coma
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else {
      // 1,234.56 -> miles con coma, decimal con punto
      clean = clean.replace(/,/g, '')
    }
  } else if (clean.includes(',')) {
    // Si solo tiene coma:
    // Si termina con exactamente 3 dígitos (ej. "120,000" o "1,000"), es separador de miles
    if (/,\d{3}$/.test(clean)) {
      clean = clean.replace(/,/g, '')
    } else {
      // Decimal (ej. "12,5" o "12,50")
      clean = clean.replace(',', '.')
    }
  } else if (clean.includes('.')) {
    // Si solo tiene punto:
    // Si termina con exactamente 3 dígitos (ej. "54.000" o "1.500.000"), es separador de miles
    if (/\.\d{3}$/.test(clean)) {
      clean = clean.replace(/\./g, '')
    }
  }

  const parsed = parseFloat(clean)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Parsea un presupuesto copiado de Excel, Google Sheets o archivo CSV.
 * Detecta delimitadores (tabulaciones, comas, punto y coma) y mapea columnas con tolerancia.
 */
export function parseBudgetSpreadsheet(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return { success: false, items: [], error: 'El texto ingresado está vacío.' }
  }

  const lines = rawText.trim().split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) {
    return { success: false, items: [], error: 'No se encontraron líneas válidas.' }
  }

  // Detectar delimitador principal de la primera línea
  const firstLine = lines[0]
  let delimiter = '\t'
  if (firstLine.includes('\t')) delimiter = '\t'
  else if (firstLine.includes(';')) delimiter = ';'
  else if (firstLine.includes(',')) delimiter = ','

  // Separar líneas en celdas
  const parsedRows = lines.map(line => {
    // Si es delimitador por coma o punto y coma, considerar comillas
    if (delimiter === '\t') {
      return line.split('\t').map(c => c.trim())
    }
    // Simple regex para CSV respetando comillas
    const row = []
    let inQuotes = false
    let currentCell = ''
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        row.push(currentCell.trim().replace(/^"|"$/g, ''))
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    row.push(currentCell.trim().replace(/^"|"$/g, ''))
    return row
  })

  // Detectar fila de cabecera si existe
  let headerIndex = -1
  let colIndex = {
    code: -1,
    rubro: -1,
    name: -1,
    unit: -1,
    quantity: -1,
    unitCost: -1,
    materialTotal: -1,
    laborTotal: -1,
    subcontractTotal: -1,
    totalBudget: -1
  }

  for (let i = 0; i < Math.min(5, parsedRows.length); i++) {
    const row = parsedRows[i].map(c => c.toLowerCase())
    const hasRubro = row.some(c => c.includes('rubro') || c.includes('capítulo') || c.includes('especialidad'))
    const hasPartida = row.some(c => c.includes('partida') || c.includes('descripción') || c.includes('item') || c.includes('concepto') || c.includes('tarea'))
    const hasUnidad = row.some(c => c === 'unidad' || c === 'un' || c === 'u' || c === 'medida')
    const hasCant = row.some(c => c.includes('cant') || c.includes('metrado'))
    const hasCosto = row.some(c => c.includes('costo') || c.includes('precio') || c.includes('monto') || c.includes('material'))

    if ((hasPartida || hasRubro) && (hasCant || hasCosto || hasUnidad)) {
      headerIndex = i
      row.forEach((col, idx) => {
        if (col.includes('código') || col.includes('codigo') || col === 'cód' || col === 'cod' || col === 'n°') colIndex.code = idx
        else if (col.includes('rubro') || col.includes('capítulo')) colIndex.rubro = idx
        else if (col.includes('partida') || col.includes('descrip') || col.includes('concepto') || col.includes('item') || col.includes('detalle')) colIndex.name = idx
        else if (col === 'unidad' || col === 'un' || col === 'und' || col === 'u' || col === 'medida') colIndex.unit = idx
        else if (col.includes('cant') || col.includes('metrado') || col.includes('volumen')) colIndex.quantity = idx
        else if (col.includes('unit') || col.includes('p.u') || col.includes('pu')) colIndex.unitCost = idx
        else if (col.includes('mat') || col.includes('material')) colIndex.materialTotal = idx
        else if (col.includes('mo') || col.includes('mano de obra') || col.includes('labor')) colIndex.laborTotal = idx
        else if (col.includes('subc') || col.includes('subcontrat')) colIndex.subcontractTotal = idx
        else if (col.includes('total') || col.includes('presupuesto')) colIndex.totalBudget = idx
      })
      break
    }
  }

  const dataRows = headerIndex >= 0 ? parsedRows.slice(headerIndex + 1) : parsedRows
  const items = []
  let currentRubro = 'General'

  dataRows.forEach((row, idx) => {
    // Si la fila está vacía, ignorar
    if (!row || row.length === 0 || row.every(c => !c)) return

    let code = ''
    let name = ''
    let unit = 'un'
    let quantity = 1
    let unitCost = 0
    let materialTotal = 0
    let laborTotal = 0
    let subcontractTotal = 0
    let totalBudget = 0

    if (headerIndex >= 0) {
      if (colIndex.rubro >= 0 && row[colIndex.rubro]) currentRubro = row[colIndex.rubro]
      code = colIndex.code >= 0 ? row[colIndex.code] : ''
      name = colIndex.name >= 0 ? row[colIndex.name] : ''
      unit = colIndex.unit >= 0 && row[colIndex.unit] ? row[colIndex.unit] : 'un'
      quantity = colIndex.quantity >= 0 ? cleanNumericValue(row[colIndex.quantity]) : 1
      unitCost = colIndex.unitCost >= 0 ? cleanNumericValue(row[colIndex.unitCost]) : 0
      materialTotal = colIndex.materialTotal >= 0 ? cleanNumericValue(row[colIndex.materialTotal]) : 0
      laborTotal = colIndex.laborTotal >= 0 ? cleanNumericValue(row[colIndex.laborTotal]) : 0
      subcontractTotal = colIndex.subcontractTotal >= 0 ? cleanNumericValue(row[colIndex.subcontractTotal]) : 0
      totalBudget = colIndex.totalBudget >= 0 ? cleanNumericValue(row[colIndex.totalBudget]) : 0
    } else {
      // Mapeo posicional por defecto: [Código, Partida, Unidad, Cantidad, Costo Unit Mat, Total Mat, MO]
      code = row[0] || `P${idx + 1}`
      name = row[1] || `Partida ${idx + 1}`
      unit = row[2] || 'un'
      quantity = cleanNumericValue(row[3]) || 1
      unitCost = cleanNumericValue(row[4]) || 0
      materialTotal = cleanNumericValue(row[5]) || (quantity * unitCost)
      laborTotal = cleanNumericValue(row[6]) || 0
      subcontractTotal = cleanNumericValue(row[7]) || 0
    }

    if (!name && code) name = code
    if (!name) return // Fila sin nombre utilizable

    if (materialTotal === 0 && unitCost > 0 && quantity > 0) {
      materialTotal = Math.round(quantity * unitCost)
    }
    if (unitCost === 0 && materialTotal > 0 && quantity > 0) {
      unitCost = Math.round(materialTotal / quantity)
    }
    if (totalBudget === 0) {
      totalBudget = materialTotal + laborTotal + subcontractTotal
    }

    items.push({
      id: `item_${Date.now()}_${idx}`,
      code: code || `0${idx + 1}.01`,
      rubroName: currentRubro,
      name,
      unit: unit || 'un',
      quantity: Math.max(0.01, quantity),
      unitMaterialCost: unitCost,
      totalMaterialCost: materialTotal,
      totalLaborCost: laborTotal,
      totalSubcontractCost: subcontractTotal,
      totalBudget: totalBudget || materialTotal
    })
  })

  if (items.length === 0) {
    return { success: false, items: [], error: 'No se pudieron extraer partidas válidas. Verifique el formato de las columnas.' }
  }

  return { success: true, items, count: items.length }
}

/**
 * Calcula el costo de materiales que toma una tarea a partir de una partida de presupuesto:
 * - Puede vincularse por porcentaje (ej. 40%)
 * - O por cantidad física / metrado (ej. 60 m² de 150 m²)
 */
export function calculateTaskMaterialCostFromPartida(partida, assignment = {}) {
  if (!partida) {
    return {
      materialCost: Number(assignment.manualMaterialCost) || 0,
      assignedPercent: 100,
      assignedQuantity: 0,
      mode: 'manual',
      description: 'Estimación manual sin partida vinculada'
    }
  }

  const totalPartidaMaterial = Number(partida.totalMaterialCost) || 0
  const totalPartidaQty = Number(partida.quantity) || 1
  const mode = assignment.mode === 'quantity' ? 'quantity' : 'percent'

  let assignedPercent = 100
  let assignedQuantity = totalPartidaQty
  let materialCost = totalPartidaMaterial

  if (mode === 'quantity') {
    assignedQuantity = Math.max(0, Number(assignment.value) || 0)
    assignedPercent = totalPartidaQty > 0 ? (assignedQuantity / totalPartidaQty) * 100 : 0
    materialCost = Math.round((Number(partida.unitMaterialCost) || (totalPartidaMaterial / totalPartidaQty)) * assignedQuantity)
  } else {
    // percent
    assignedPercent = Math.max(0, Number(assignment.value != null ? assignment.value : 100))
    assignedQuantity = (totalPartidaQty * assignedPercent) / 100
    materialCost = Math.round(totalPartidaMaterial * (assignedPercent / 100))
  }

  const description = `${partida.rubroName ? `${partida.rubroName} — ` : ''}${partida.code ? `[${partida.code}] ` : ''}${partida.name} (${Math.round(assignedPercent)}% • ${assignedQuantity.toLocaleString('es-UY', { maximumFractionDigits: 1 })} ${partida.unit})`

  return {
    partidaId: partida.id,
    partidaCode: partida.code,
    partidaName: partida.name,
    rubroName: partida.rubroName,
    mode,
    assignedPercent: Math.round(assignedPercent * 10) / 10,
    assignedQuantity: Math.round(assignedQuantity * 10) / 10,
    unit: partida.unit,
    materialCost,
    description
  }
}

/**
 * Audita la asignación de presupuesto entre todas las tareas del cronograma:
 * 1. Alerta si un rubro/partida queda asignado a más del 100% entre todas las tareas
 * 2. Identifica si queda presupuesto sin asignar a ninguna tarea
 * 3. Identifica tareas con materiales cargados a mano ("estimación manual")
 */
export function auditBudgetAssignments(budgetItems = [], tasks = []) {
  const itemAudits = (budgetItems || []).map(item => {
    // Buscar todas las tareas vinculadas a esta partida
    const linkedTasks = (tasks || []).filter(t => {
      if (t.linkedPartidaId && t.linkedPartidaId === item.id) return true
      if (t.budgetPartidaId && t.budgetPartidaId === item.id) return true
      if (t.partidaCode && t.partidaCode === item.code) return true
      return false
    })

    const totalAssignedPercent = linkedTasks.reduce((sum, t) => {
      const pct = t.assignedPartidaPercent != null ? Number(t.assignedPartidaPercent) : (t.partidaPercent != null ? Number(t.partidaPercent) : 100)
      return sum + (Number.isNaN(pct) ? 0 : pct)
    }, 0)

    const totalAssignedMaterialCost = linkedTasks.reduce((sum, t) => sum + (Number(t.materialCost) || 0), 0)
    const budgetMaterial = Number(item.totalMaterialCost) || 0
    const remainingMaterialCost = budgetMaterial - totalAssignedMaterialCost

    let status = 'normal'
    let warning = null

    if (totalAssignedPercent > 100) {
      status = 'overallocated'
      warning = `⚠️ Sobreasignación: Partida "${item.name}" asignada al ${Math.round(totalAssignedPercent)}% entre ${linkedTasks.length} tareas (${linkedTasks.map(t => t.name).join(', ')}). Excede el 100% presupuestado.`
    } else if (linkedTasks.length === 0) {
      status = 'unassigned'
      warning = `ℹ️ Partida sin asignar: "${item.name}" ($${budgetMaterial.toLocaleString('es-UY')}) no está vinculada a ninguna tarea del cronograma.`
    } else if (totalAssignedPercent < 100) {
      status = 'partial'
    }

    return {
      itemId: item.id,
      code: item.code,
      name: item.name,
      rubroName: item.rubroName,
      unit: item.unit,
      quantity: item.quantity,
      budgetMaterialCost: budgetMaterial,
      totalAssignedPercent: Math.round(totalAssignedPercent * 10) / 10,
      totalAssignedMaterialCost,
      remainingMaterialCost,
      linkedTasksCount: linkedTasks.length,
      linkedTasks: linkedTasks.map(t => ({ id: t.id, name: t.name, percent: t.assignedPartidaPercent || 100 })),
      status,
      warning
    }
  })

  // Detectar tareas que no tienen partida vinculada (estimación manual)
  const manualTasks = (tasks || []).filter(t => !t.linkedPartidaId && !t.budgetPartidaId)

  const overallocatedItems = itemAudits.filter(a => a.status === 'overallocated')
  const unassignedItems = itemAudits.filter(a => a.status === 'unassigned')

  const totalBudgetMaterial = (budgetItems || []).reduce((sum, i) => sum + (Number(i.totalMaterialCost) || 0), 0)
  const totalAssignedMaterial = (tasks || []).reduce((sum, t) => sum + (Number(t.materialCost) || 0), 0)
  const totalManualMaterial = manualTasks.reduce((sum, t) => sum + (Number(t.materialCost) || 0), 0)

  return {
    itemAudits,
    overallocatedItems,
    unassignedItems,
    manualTasksCount: manualTasks.length,
    totalBudgetMaterial,
    totalAssignedMaterial,
    totalManualMaterial,
    hasOverallocations: overallocatedItems.length > 0,
    hasUnassignedItems: unassignedItems.length > 0
  }
}
