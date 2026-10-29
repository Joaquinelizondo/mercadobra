import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanNumericValue,
  parseBudgetSpreadsheet,
  calculateTaskMaterialCostFromPartida,
  auditBudgetAssignments,
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

