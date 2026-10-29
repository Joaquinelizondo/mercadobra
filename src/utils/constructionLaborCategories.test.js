import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SOCIAL_LAWS_RATE,
  DEFAULT_LABOR_CATEGORIES,
  DEFAULT_CREW_TEMPLATES,
  calculateCrewDailyCost,
  calculateCrewTotalPeople,
  calculateTaskLaborAndSocial,
  calculateIndirectCostsTotals,
  calculateProjectCostBreakdown
} from './constructionLaborCategories.js'

test('DEFAULT_SOCIAL_LAWS_RATE es 60% por defecto', () => {
  assert.equal(DEFAULT_SOCIAL_LAWS_RATE, 0.60)
})

test('calculateCrewDailyCost calcula el costo diario acumulado de una cuadrilla mixta', () => {
  // Cuadrilla albañilería: 1 Oficial ($2800) + 1 Medio Oficial ($2200) + 2 Peones Prácticos ($1800 cada uno = $3600)
  // Total diario = 2800 + 2200 + 3600 = $8600
  const lines = [
    { count: 1, dailyRate: 2800 },
    { count: 1, dailyRate: 2200 },
    { count: 2, dailyRate: 1800 }
  ]
  const daily = calculateCrewDailyCost(lines)
  assert.equal(daily, 8600)

  const people = calculateCrewTotalPeople(lines)
  assert.equal(people, 4)
})

test('calculateTaskLaborAndSocial calcula mano de obra y leyes sociales al 60% configurable', () => {
  // Tarea de 15 días hábiles con cuadrilla mixta diaria de $8600
  const task = {
    workDays: 15,
    crewLines: [
      { count: 1, dailyRate: 2800 },
      { count: 1, dailyRate: 2200 },
      { count: 2, dailyRate: 1800 }
    ]
  }

  const res = calculateTaskLaborAndSocial(task)
  // MO = 8600 * 15 = 129000
  assert.equal(res.laborCost, 129000)
  // LLSS al 60% = 129000 * 0.60 = 77400
  assert.equal(res.socialLawsCost, 77400)
  assert.equal(res.totalLaborPlusSocial, 129000 + 77400)

  // Probamos con tasa personalizada de obra (ej. 62%)
  const custom = calculateTaskLaborAndSocial(task, { socialLawsRate: 0.62 })
  assert.equal(custom.socialLawsCost, Math.round(129000 * 0.62))
})

test('calculateTaskLaborAndSocial mantiene retrocompatibilidad con tareas de formato simple', () => {
  const legacyTask = {
    peopleCount: 4,
    categoryRate: 3400,
    workDays: 10
  }
  const res = calculateTaskLaborAndSocial(legacyTask)
  // 4 * 3400 = 13600/d * 10 = 136000
  assert.equal(res.laborCost, 136000)
  assert.equal(res.socialLawsCost, Math.round(136000 * 0.60))
})

test('calculateTaskLaborAndSocial respeta porcentaje configurable por categoría', () => {
  const categories = [
    { role: 'Oficial Especializado', dailyRate: 3400, socialLawsRate: 65 }, // 65% específico
    { role: 'Peón Común', dailyRate: 1950, socialLawsRate: 55 } // 55% específico
  ]

  const task = {
    category: 'Oficial Especializado',
    peopleCount: 2,
    categoryRate: 3400,
    workDays: 10
  }

  // Obra tiene 60% por defecto, pero la categoría tiene 65%
  const res = calculateTaskLaborAndSocial(task, { socialLawsRate: 0.60, laborCategories: categories })
  assert.equal(res.laborCost, 68000)
  assert.equal(res.socialLawsCost, Math.round(68000 * 0.65))
  assert.equal(res.effectiveSocialRate, 0.65)
})

test('calculateTaskLaborAndSocial respeta sobreescritura manual en tarea puntual', () => {
  const task = {
    peopleCount: 1,
    categoryRate: 2800,
    workDays: 5,
    socialLawsCost: 5000 // Sobrescrito a mano (en lugar del cálculo automático 60% = 8400)
  }

  const res = calculateTaskLaborAndSocial(task)
  assert.equal(res.laborCost, 14000)
  assert.equal(res.socialLawsCost, 5000)
  assert.equal(res.isCustomSocial, true)
  assert.equal(res.totalLaborPlusSocial, 14000 + 5000)
})

test('calculateIndirectCostsTotals calcula presupuesto y ejecutado de gastos generales', () => {
  const expenses = [
    { budgeted: 100000, executed: 80000 },
    { budgeted: 50000, executed: 55000 }
  ]
  const totals = calculateIndirectCostsTotals(expenses)
  assert.equal(totals.budgeted, 150000)
  assert.equal(totals.executed, 135000)
  assert.equal(totals.balance, 15000)
  assert.equal(totals.percentConsumed, 90)
})

test('calculateProjectCostBreakdown consolida Costo Directo + Costo Indirecto = Costo Total', () => {
  const direct = { budgeted: 8000000, executed: 6000000 }
  const indirect = { budgeted: 2000000, executed: 1500000 }

  const breakdown = calculateProjectCostBreakdown(direct, indirect)
  assert.equal(breakdown.totalBudget, 10000000)
  assert.equal(breakdown.totalExecuted, 7500000)
  assert.equal(breakdown.totalBalance, 2500000)
  assert.equal(breakdown.totalPercentConsumed, 75)
  assert.equal(breakdown.directPercentOfTotal, 80)
  assert.equal(breakdown.indirectPercentOfTotal, 20)
  assert.match(breakdown.formulaSummary, /Costo Directo.*Costo Indirecto.*Costo Total/)
})

