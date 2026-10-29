import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateWorkingDays,
  distributeCostByMonths,
  getUruguayHolidaysForYear,
  isWorkingDay
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
