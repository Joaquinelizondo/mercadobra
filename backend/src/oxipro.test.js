import test from 'node:test'
import assert from 'node:assert/strict'
import { generateHeuristicConstructionPlan, generateOxiProPlanFromSpec } from './oxiProAiService.js'
import { getRepository } from './repository.js'

test('generateHeuristicConstructionPlan genera cronograma coherente con BPS al 65%', () => {
  const plan = generateHeuristicConstructionPlan('Edificio residencial de 4 niveles con herrería', {
    startDate: '2026-11-02'
  })

  assert.ok(Array.isArray(plan.tasks) && plan.tasks.length >= 5, 'Debe generar al menos 5 tareas')
  assert.ok(Array.isArray(plan.rubros) && plan.rubros.length >= 4, 'Debe generar al menos 4 rubros')
  assert.ok(plan.totalBudget > 0, 'El presupuesto total debe ser positivo')

  // Verificar leyes sociales al 65% de la mano de obra
  plan.tasks.forEach(task => {
    assert.ok(task.name && task.name.length > 2)
    assert.ok(task.startDate <= task.endDate)
    assert.equal(task.socialLawsCost, Math.round(task.assignedLaborCost * 0.65))
    assert.ok(Array.isArray(task.certifications))
  })
})

test('generateHeuristicConstructionPlan adapta tareas para nave industrial', () => {
  const plan = generateHeuristicConstructionPlan('Nave industrial logística con piso de hormigón y estructura metálica')
  assert.ok(plan.tasks.some(t => t.name.toLowerCase().includes('metálica') || t.name.toLowerCase().includes('metalic')))
  assert.ok(plan.tasks.some(t => t.name.toLowerCase().includes('piso') || t.name.toLowerCase().includes('pavimento')))
})

test('oxipro repository methods funcionan en memoria (dual repo fallback)', async () => {
  const repo = await getRepository()
  const projectId = 999

  // 1. Guardar tareas
  const tasksToSave = [
    {
      name: 'Fundaciones y Bases',
      startDate: '2026-11-01',
      endDate: '2026-11-20',
      peopleCount: 4,
      category: 'Oficial',
      categoryRate: 2800,
      assignedLaborCost: 400000,
      socialLawsCost: 260000,
      materialCost: 600000,
      month: 'Mes 1',
      plannedPercent: 100,
      progressPercent: 50,
      certifications: [
        { id: 1, date: '2026-11-15', certifiedPercent: 50, inspector: 'Ing. Supervisor', notes: 'Bases listas', photos: [] }
      ]
    }
  ]
  const savedTasks = await repo.saveOxiProTasks(projectId, tasksToSave)
  assert.equal(savedTasks.length, 1)
  assert.equal(savedTasks[0].name, 'Fundaciones y Bases')
  assert.equal(savedTasks[0].certifications.length, 1)

  // 2. Guardar rubros
  const rubrosToSave = [
    {
      id: 'rubro_1',
      name: 'Cimentaciones',
      laborCost: 400000,
      socialLawsCost: 260000,
      materialCost: 600000,
      budgeted: 1260000,
      executed: 630000
    }
  ]
  const savedRubros = await repo.saveOxiProRubros(projectId, rubrosToSave)
  assert.equal(savedRubros.length, 1)
  assert.equal(savedRubros[0].name, 'Cimentaciones')

  // 3. Crear demora por lluvia
  const delay = await repo.createOxiProDelay(projectId, {
    eventDate: '2026-11-10',
    days: 3,
    cause: 'Lluvias intensas',
    notes: 'Anegamiento de terreno'
  })
  assert.ok(delay.id)
  assert.equal(delay.days, 3)

  // 4. Obtener datos consolidados del proyecto
  const projectData = await repo.getOxiProProjectData(projectId)
  assert.equal(projectData.tasks.length, 1)
  assert.equal(projectData.rubros.length, 1)
  assert.equal(projectData.delays.length, 1)

  // 5. Eliminar demora
  const deleted = await repo.deleteOxiProDelay(delay.id, projectId)
  assert.ok(deleted)

  const updatedData = await repo.getOxiProProjectData(projectId)
  assert.equal(updatedData.delays.length, 0)
})

