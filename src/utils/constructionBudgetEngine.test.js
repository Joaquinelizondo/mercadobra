import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanNumericValue,
  parseBudgetSpreadsheet,
  calculateTaskMaterialCostFromPartida,
  auditBudgetAssignments,
  syncBudgetItemsToRubros,
  generateScheduleFromBudgetItems,
  DEFAULT_BUDGET_ITEMS
} from './constructionBudgetEngine.js'

test('cleanNumericValue limpia formatos monetarios internacionales y separadores', () => {
  assert.equal(cleanNumericValue('$1.500,50'), 1500.5)
  assert.equal(cleanNumericValue('USD 120,000'), 120000)
  assert.equal(cleanNumericValue('450.75 UYU'), 450.75)
  assert.equal(cleanNumericValue('1250'), 1250)
  assert.equal(cleanNumericValue(3400), 3400)
  assert.equal(cleanNumericValue(''), 0)
})

test('parseBudgetSpreadsheet interpreta texto copiado de Excel / TSV', () => {
  const excelClipboard = `Código\tRubro\tPartida\tUnidad\tCantidad\tCosto Unitario Mat\tTotal Materiales
05.01\tAlbañilería\tMuro de ticholo cerámico\tm²\t120\t$450\t$54.000
05.02\tAlbañilería\tRevoque fino interior\tm²\t240\t$280\t$67.200`

  const result = parseBudgetSpreadsheet(excelClipboard)
  assert.equal(result.success, true)
  assert.equal(result.items.length, 2)

  const item1 = result.items[0]
  assert.equal(item1.code, '05.01')
  assert.equal(item1.rubroName, 'Albañilería')
  assert.equal(item1.name, 'Muro de ticholo cerámico')
  assert.equal(item1.unit, 'm²')
  assert.equal(item1.quantity, 120)
  assert.equal(item1.unitMaterialCost, 450)
  assert.equal(item1.totalMaterialCost, 54000)
})

test('parseBudgetSpreadsheet interpreta CSV separado por comas o punto y coma', () => {
  const csvText = `Código;Rubro;Partida;Unidad;Cantidad;Costo Unitario;Total Mat
03.01;Herrería;Baranda balcones OXI;ml;45;1200;54000`

  const result = parseBudgetSpreadsheet(csvText)
  assert.equal(result.success, true)
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].rubroName, 'Herrería')
  assert.equal(result.items[0].totalMaterialCost, 54000)
})

test('calculateTaskMaterialCostFromPartida vincula materiales por porcentaje', () => {
  const partida = {
    id: 'p_01',
    code: '05.02',
    rubroName: 'Albañilería',
    name: 'Revoque grueso y fino',
    unit: 'm²',
    quantity: 500,
    unitMaterialCost: 300,
    totalMaterialCost: 150000
  }

  // Tarea toma el 60% de la partida
  const calc = calculateTaskMaterialCostFromPartida(partida, { mode: 'percent', value: 60 })
  assert.equal(calc.materialCost, 90000) // 150000 * 0.60
  assert.equal(calc.assignedQuantity, 300) // 500 * 0.60
  assert.equal(calc.assignedPercent, 60)
  assert.match(calc.description, /60%/)
})

test('calculateTaskMaterialCostFromPartida vincula materiales por cantidad física (metrado)', () => {
  const partida = {
    id: 'p_01',
    code: '05.02',
    rubroName: 'Albañilería',
    name: 'Revoque grueso y fino',
    unit: 'm²',
    quantity: 500,
    unitMaterialCost: 300,
    totalMaterialCost: 150000
  }

  // Tarea toma 200 m² de los 500 m² totales (40%)
  const calc = calculateTaskMaterialCostFromPartida(partida, { mode: 'quantity', value: 200 })
  assert.equal(calc.materialCost, 60000) // 200 * 300
  assert.equal(calc.assignedPercent, 40)
  assert.equal(calc.assignedQuantity, 200)
})

test('auditBudgetAssignments detecta sobreasignación (> 100%) y presupuesto sin asignar', () => {
  const budget = [
    {
      id: 'p1',
      code: '01.01',
      name: 'Excavación',
      totalMaterialCost: 100000
    },
    {
      id: 'p2',
      code: '02.01',
      name: 'Hormigón de Losas',
      totalMaterialCost: 400000
    }
  ]

  const tasks = [
    { id: 1, name: 'Excavación Frente A', linkedPartidaId: 'p1', assignedPartidaPercent: 60, materialCost: 60000 },
    { id: 2, name: 'Excavación Frente B', linkedPartidaId: 'p1', assignedPartidaPercent: 55, materialCost: 55000 },
    // p2 no tiene ninguna tarea asignada (0%)
    { id: 3, name: 'Mantenimiento General', materialCost: 20000 } // Estimación manual
  ]

  const audit = auditBudgetAssignments(budget, tasks)

  // p1 suma 60% + 55% = 115% (> 100%) -> sobreasignación
  assert.equal(audit.hasOverallocations, true)
  assert.equal(audit.overallocatedItems.length, 1)
  assert.equal(audit.overallocatedItems[0].code, '01.01')
  assert.equal(audit.overallocatedItems[0].totalAssignedPercent, 115)

  // p2 está sin asignar
  assert.equal(audit.hasUnassignedItems, true)
  assert.equal(audit.unassignedItems.length, 1)
  assert.equal(audit.unassignedItems[0].code, '02.01')

  // Tarea 3 fue cargada a mano
  assert.equal(audit.manualTasksCount, 1)
  assert.equal(audit.totalManualMaterial, 20000)
})

test('syncBudgetItemsToRubros agrupa partidas importadas y sincroniza con los rubros', () => {
  const items = [
    { code: '01.01', rubroName: 'Movimiento de Suelos', name: 'Zanjas', totalMaterialCost: 50000, totalLaborCost: 80000, totalBudget: 130000 },
    { code: '01.02', rubroName: 'Movimiento de Suelos', name: 'Relleno', totalMaterialCost: 20000, totalLaborCost: 30000, totalBudget: 50000 },
    { code: '02.01', rubroName: 'Estructura de Hormigón', name: 'Pilares', totalMaterialCost: 150000, totalLaborCost: 120000, totalBudget: 270000 }
  ]

  const existingRubros = [
    { id: 'mov_suelos', name: 'Movimiento de Suelos', budgeted: 100000, executed: 45000 }
  ]

  const synced = syncBudgetItemsToRubros(items, existingRubros, 60)
  assert.equal(synced.length, 2)

  // El rubro existente actualiza su presupuesto a 130k + 50k = 180k y preserva su ejecutado
  const rubro1 = synced.find(r => r.name === 'Movimiento de Suelos')
  assert.ok(rubro1)
  assert.equal(rubro1.budgeted, 180000)
  assert.equal(rubro1.materialCost, 70000)
  assert.equal(rubro1.laborCost, 110000)
  assert.equal(rubro1.socialLawsCost, 66000) // 110000 * 0.60
  assert.equal(rubro1.executed, 45000)

  // El nuevo rubro de estructura se da de alta automáticamente
  const rubro2 = synced.find(r => r.name === 'Estructura de Hormigón')
  assert.ok(rubro2)
  assert.equal(rubro2.budgeted, 270000)
  assert.equal(rubro2.materialCost, 150000)
  assert.equal(rubro2.laborCost, 120000)
  assert.equal(rubro2.executed, 0)
})

test('generateScheduleFromBudgetItems arma la secuencia cronológica lógica constructiva y encadena dependencias', () => {
  // Partidas deliberadamente desordenadas: Pintura -> Fundaciones -> Estructura
  const items = [
    { id: 'p_pintura', code: '07.01', rubroName: 'Pintura y Terminaciones', name: 'Látex al agua', totalMaterialCost: 40000, totalBudget: 100000 },
    { id: 'p_fundac', code: '01.01', rubroName: 'Excavación y Fundaciones', name: 'Cimentaciones', totalMaterialCost: 80000, totalBudget: 250000 },
    { id: 'p_estruct', code: '02.01', rubroName: 'Estructura de Hormigón', name: 'Vigas y losas', totalMaterialCost: 180000, totalBudget: 500000 }
  ]

  const schedule = generateScheduleFromBudgetItems(items, {
    projectStartDate: '2026-11-02', // Lunes
    socialLawsRate: 60
  })

  assert.equal(schedule.length, 3)

  // 1. Debe haber ordenado la secuencia: Fundaciones -> Estructura -> Pintura
  assert.equal(schedule[0].name, 'Excavación y Fundaciones')
  assert.equal(schedule[1].name, 'Estructura de Hormigón')
  assert.equal(schedule[2].name, 'Pintura y Terminaciones')

  // 2. Primera tarea inicia el 2026-11-02 sin predecesora
  assert.equal(schedule[0].startDate, '2026-11-02')
  assert.equal(schedule[0].predecessorId, null)
  assert.ok(schedule[0].endDate > schedule[0].startDate)
  assert.ok(schedule[0].crewLines.length > 0)
  assert.ok(schedule[0].socialLawsCost > 0)

  // 3. Segunda tarea (Estructura) debe encadenarse como sucesora de Fundaciones (FS)
  assert.equal(schedule[1].predecessorId, schedule[0].id)
  assert.ok(schedule[1].startDate > schedule[0].startDate)

  // 4. Tercera tarea (Pintura) debe encadenarse como sucesora de Estructura (FS)
  assert.equal(schedule[2].predecessorId, schedule[1].id)
  assert.ok(schedule[2].startDate > schedule[1].startDate)
})

