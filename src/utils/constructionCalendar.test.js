import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateWorkingDays,
  distributeCostByMonths,
  getUruguayHolidaysForYear,
  isWorkingDay,
  addWorkingDays,
  calculateTaskEndDateFromDuration,
  calculateDependentTaskDates,
  recalculateScheduleDependencies
} from './constructionCalendar.js'

test('calculateWorkingDays descuenta fines de semana y feriados en Uruguay', () => {
  // Lunes 2026-10-05 a Viernes 2026-10-09 = 5 días hábiles
  const days1 = calculateWorkingDays('2026-10-05', '2026-10-09')
  assert.equal(days1, 5)

  // Lunes 2026-10-05 a Domingo 2026-10-11 = 5 días hábiles (sábado y domingo descartados)
  const days2 = calculateWorkingDays('2026-10-05', '2026-10-11')
  assert.equal(days2, 5)

  // Caso real del documento: 08/09/2026 (martes) al 26/09/2026 (sábado)
  // Sem 1: mar 8, mie 9, jue 10, vie 11 (4)
  // Sem 2: lun 14, mar 15, mie 16, jue 17, vie 18 (5)
  // Sem 3: lun 21, mar 22, mie 23, jue 24, vie 25 (5)
  // Total = 14 o 15 días hábiles (NUNCA 48 días como marcaba el error)
  const days3 = calculateWorkingDays('2026-09-08', '2026-09-26')
  assert.ok(days3 >= 14 && days3 <= 15, `Días calculados: ${days3}`)
})

test('getUruguayHolidaysForYear incluye el Día del Trabajador de la Construcción (3er lunes de octubre)', () => {
  const holidays2026 = getUruguayHolidaysForYear(2026)
  // En Octubre 2026:
  // 1 oct = jueves
  // 1er lunes: 5 oct
  // 2do lunes: 12 oct
  // 3er lunes: 19 oct -> Día de la Construcción
  assert.ok(holidays2026.has('2026-10-19'), '19 de Octubre 2026 debe ser feriado de la construcción')
  assert.ok(holidays2026.has('2026-05-01'), '1 de Mayo debe ser feriado')
  assert.ok(holidays2026.has('2026-12-25'), '25 de Diciembre debe ser feriado')
})

test('distributeCostByMonths reparte presupuesto proporcionalmente por días hábiles', () => {
  // Tarea que cruza de fin de setiembre a mediados de octubre 2026
  // Setiembre: 2026-09-21 al 2026-09-30 (8 días hábiles)
  // Octubre: 2026-10-01 al 2026-10-16 (12 días hábiles aprox)
  const res = distributeCostByMonths('2026-09-21', '2026-10-16', 500000)
  assert.equal(res.breakdown.length, 2)
  assert.equal(res.breakdown[0].monthLabel, 'Set. 2026')
  assert.equal(res.breakdown[1].monthLabel, 'Oct. 2026')
  
  const sumCost = res.breakdown[0].cost + res.breakdown[1].cost
  assert.equal(sumCost, 500000)
  assert.ok(res.breakdown[0].workDays > 0)
  assert.ok(res.breakdown[1].workDays > 0)
  assert.ok(res.primaryMonthLabel.includes('Set. 2026'))
})

test('addWorkingDays avanza y descuenta días hábiles respetando fines de semana', () => {
  // Viernes 2026-10-02 + 1 día hábil = Lunes 2026-10-05
  assert.equal(addWorkingDays('2026-10-02', 1), '2026-10-05')
  // Lunes 2026-10-05 + 5 días hábiles = Lunes 2026-10-12
  assert.equal(addWorkingDays('2026-10-05', 5), '2026-10-12')
})

test('calculateDependentTaskDates calcula inicio y fin al terminar predecesora (FS lag 0)', () => {
  // Predecesora: Losa termina el jueves 2026-10-08
  const losa = { id: 101, name: 'Losa de Hormigón', startDate: '2026-10-01', endDate: '2026-10-08' }
  // Tarea dependiente: Desencofrado (duración 2 días hábiles, inmediatamente al terminar)
  const desencofrado = calculateDependentTaskDates(losa, { dependencyType: 'FS', lagDays: 0, workDays: 2 })
  // Inicia el viernes 2026-10-09 y termina el lunes 2026-10-12 (2 días hábiles)
  assert.equal(desencofrado.startDate, '2026-10-09')
  assert.equal(desencofrado.endDate, '2026-10-12')
  assert.equal(desencofrado.workDays, 2)
})

test('calculateDependentTaskDates soporta desfase (ej: pilar 3 días hábiles luego de hacer la losa)', () => {
  // Caso exacto pedido por el usuario:
  // Losa termina el viernes 2026-10-02
  const losa = { id: 101, name: 'Losa', startDate: '2026-09-25', endDate: '2026-10-02' }
  // Pilar inicia 3 días hábiles después del fin de la losa
  // Días de espera hábiles: lun 5, mar 6, mie 7.
  // Inicia el 4to día hábil: jueves 2026-10-08
  const pilar = calculateDependentTaskDates(losa, { dependencyType: 'FS', lagDays: 3, workDays: 5 })
  assert.equal(pilar.startDate, '2026-10-08')
  // Duración 5 días hábiles: jue 8, vie 9, lun 12, mar 13, mie 14
  assert.equal(pilar.endDate, '2026-10-14')
  assert.equal(pilar.workDays, 5)
})

test('recalculateScheduleDependencies actualiza tareas dependientes en cascada si cambia la predecesora', () => {
  const schedule = [
    { id: 't1', name: 'Losa', startDate: '2026-10-01', endDate: '2026-10-07', workDays: 5 },
    { id: 't2', name: 'Pilar', dependsOnTaskId: 't1', dependencyType: 'FS', lagDays: 1, workDays: 3, startDate: '2026-10-09', endDate: '2026-10-13' }
  ]

  // Simulamos que la Losa se extiende hasta el viernes 2026-10-09
  schedule[0].endDate = '2026-10-09'

  const updated = recalculateScheduleDependencies(schedule)
  const pilarUpdated = updated.find(t => t.id === 't2')

  // Tras el fin del viernes 09, con lag 1:
  // Día 1 hábil después es lunes 12. Con lag 1 día adicional, inicia el martes 13
  assert.equal(pilarUpdated.startDate, '2026-10-13')
  assert.equal(pilarUpdated.workDays, 3)
})

test('recalculateScheduleDependencies preserva corrimientos por lluvia y no retrocede tareas sucesoras', () => {
  const schedule = [
    { id: 't1', name: 'Fundaciones', startDate: '2026-10-01', endDate: '2026-10-24', workDays: 16, progressPercent: 100 },
    // T2 fue postergada por 2 días de lluvia al 2026-10-28 (en vez del 26)
    { id: 't2', name: 'Estructura', dependsOnTaskId: 't1', dependencyType: 'FS', lagDays: 0, workDays: 10, startDate: '2026-10-28', endDate: '2026-11-10' }
  ]

  const updated = recalculateScheduleDependencies(schedule)
  const t2 = updated.find(t => t.id === 't2')

  // No debe retroceder al 2026-10-26 (fin de T1), debe mantener el corrimiento de lluvia del 2026-10-28
  assert.equal(t2.startDate, '2026-10-28')
  assert.equal(t2.workDays, 10)
})

test('recalculateScheduleDependencies solo empuja sucesoras vinculadas y deja intactas las tareas independientes no postergadas', () => {
  const schedule = [
    // Tarea exterior postergada por lluvia
    { id: 't1', name: 'Hormigón Exterior', startDate: '2026-10-01', endDate: '2026-10-14', workDays: 10 },
    // Tarea que depende de t1
    { id: 't2', name: 'Desencofrado', dependsOnTaskId: 't1', dependencyType: 'FS', lagDays: 0, workDays: 3, startDate: '2026-10-08', endDate: '2026-10-10' },
    // Tarea interior independiente que NO se postergó
    { id: 't3', name: 'Yeso Interior', startDate: '2026-10-05', endDate: '2026-10-12', workDays: 6 }
  ]

  const updated = recalculateScheduleDependencies(schedule)
  const t2 = updated.find(t => t.id === 't2')
  const t3 = updated.find(t => t.id === 't3')

  // t2 debe empujarse tras t1 (termina 14 oct, siguiente día hábil 15 oct)
  assert.equal(t2.startDate, '2026-10-15')
  // t3 no depende de nadie y no fue postergada, debe mantener intactas sus fechas
  assert.equal(t3.startDate, '2026-10-05')
  assert.equal(t3.endDate, '2026-10-12')
})
