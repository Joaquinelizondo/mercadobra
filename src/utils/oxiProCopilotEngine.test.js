import { test } from 'node:test'
import assert from 'node:assert/strict'
import { interpretCopilotPrompt } from './oxiProCopilotEngine.js'

test('OxI Pro Copilot: detecta tareas atrasadas en consulta Q&A', () => {
  const context = {
    project: { name: 'Edificio Residencial Óxida' },
    schedule: [
      { id: 1, name: 'Fundaciones', plannedPercent: 100, progressPercent: 100 },
      { id: 2, name: 'Estructura de Hormigón', plannedPercent: 75, progressPercent: 40 },
      { id: 3, name: 'Herrería de Fachada', plannedPercent: 20, progressPercent: 30 }
    ],
    rubros: []
  }

  const res = interpretCopilotPrompt('¿qué tareas están atrasadas respecto al plan?', context)
  assert.equal(res.action, null)
  assert.match(res.reply, /Estructura de Hormigón/)
  assert.match(res.reply, /-35% de desvío/)
})

test('OxI Pro Copilot: extrae y genera acción de creación de tarea con cuadrilla SUNCA y BPS', () => {
  const context = {
    project: { name: 'Edificio Residencial Óxida' },
    schedule: [
      { id: 1, name: 'Fundaciones', progressPercent: 100 }
    ],
    rubros: []
  }

  const prompt = 'Agregá colocación de barandas metálicas del 1 al 10 de noviembre con 3 oficiales especializados y $150.000 de materiales'
  const res = interpretCopilotPrompt(prompt, context)

  assert.ok(res.action)
  assert.equal(res.action.type, 'CREATE_TASK')
  assert.match(res.action.payload.name, /Barandas/i)
  assert.equal(res.action.payload.startDate, '2026-11-01')
  assert.equal(res.action.payload.endDate, '2026-11-10')
  assert.equal(res.action.payload.peopleCount, 3)
  assert.equal(res.action.payload.category, 'Oficial Especializado')
  assert.equal(res.action.payload.categoryRate, 3400)
  assert.equal(res.action.payload.materialCost, 150000)
  assert.ok(res.action.payload.assignedLaborCost > 0)
  assert.equal(res.action.payload.socialLawsCost, Math.round(res.action.payload.assignedLaborCost * 0.65))
})

test('OxI Pro Copilot: genera acción para actualizar avance físico de una tarea', () => {
  const context = {
    schedule: [
      { id: 1, name: 'Fundaciones y Movimiento de Suelos', progressPercent: 50 },
      { id: 2, name: 'Estructura de Hormigón', progressPercent: 20 }
    ]
  }

  const res = interpretCopilotPrompt('Marcá la tarea de estructura al 90%', context)
  assert.ok(res.action)
  assert.equal(res.action.type, 'UPDATE_TASK_PROGRESS')
  assert.equal(res.action.payload.taskId, 2)
  assert.equal(res.action.payload.newProgress, 90)
})

test('OxI Pro Copilot: interpreta registro de lluvia y genera acción de desplazamiento en cascada', () => {
  const context = {
    schedule: [
      { id: 1, name: 'Pintura Epoxi', startDate: '2026-10-20', endDate: '2026-10-28', progressPercent: 0 }
    ],
    rainLogs: []
  }

  const res = interpretCopilotPrompt('Tuvimos 3 días de lluvia por temporal', context)
  assert.ok(res.action)
  assert.equal(res.action.type, 'SHIFT_SCHEDULE_RAIN')
  assert.equal(res.action.payload.days, 3)
  assert.match(res.action.payload.reason, /temporal/i)
})

test('OxI Pro Copilot: crea partida presupuestaria con desglose de leyes sociales BPS', () => {
  const context = { rubros: [] }

  const res = interpretCopilotPrompt('Creá un rubro de Aberturas de PVC con $400.000', context)
  assert.ok(res.action)
  assert.equal(res.action.type, 'CREATE_RUBRO')
  assert.match(res.action.payload.name, /Aberturas de PVC/i)
  assert.equal(res.action.payload.budgeted, 400000)
  assert.ok(res.action.payload.laborCost > 0)
  assert.equal(res.action.payload.socialLawsCost, Math.round(res.action.payload.laborCost * 0.65))
})
