import test from 'node:test'
import assert from 'node:assert/strict'
import { ensureB2bProjectAccess, filterOrdersForProvider } from './resourceAuthorization.js'
import { NotFoundError } from './errors.js'

test('ensureB2bProjectAccess permite acceso al cliente dueño del proyecto', async () => {
  const fakeRepo = {
    async getB2bProjectById(id) {
      if (id === 10) return { id: 10, customerUserId: 42, name: 'Torre del Parque' }
      return null
    }
  }

  const authUser = { id: 42, role: 'customer' }
  const project = await ensureB2bProjectAccess(fakeRepo, 10, authUser)
  assert.equal(project.id, 10)
  assert.equal(project.name, 'Torre del Parque')
})

test('ensureB2bProjectAccess bloquea con 404 (IDOR) a clientes ajenos al proyecto', async () => {
  const fakeRepo = {
    async getB2bProjectById(id) {
      if (id === 10) return { id: 10, customerUserId: 42, name: 'Torre del Parque' }
      return null
    }
  }

  const maliciousUser = { id: 99, role: 'customer' }
  await assert.rejects(
    async () => {
      await ensureB2bProjectAccess(fakeRepo, 10, maliciousUser)
    },
    (err) => {
      assert(err instanceof NotFoundError)
      assert.equal(err.message, 'Proyecto de obra no encontrado')
      return true
    }
  )
})

test('ensureB2bProjectAccess permite acceso irrestricto a administradores', async () => {
  const fakeRepo = {
    async getB2bProjectById(id) {
      if (id === 10) return { id: 10, customerUserId: 42, name: 'Torre del Parque' }
      return null
    }
  }

  const adminUser = { id: 1, role: 'admin' }
  const project = await ensureB2bProjectAccess(fakeRepo, 10, adminUser)
  assert.equal(project.id, 10)
})

test('ensureB2bProjectAccess arroja 404 si el proyecto no existe', async () => {
  const fakeRepo = {
    async getB2bProjectById() {
      return null
    }
  }

  const user = { id: 42, role: 'customer' }
  await assert.rejects(
    async () => {
      await ensureB2bProjectAccess(fakeRepo, 999, user)
    },
    NotFoundError
  )
})

test('filterOrdersForProvider retorna todas las órdenes para el rol admin', () => {
  const orders = [
    { id: 1, items: [{ productId: 101 }] },
    { id: 2, items: [{ productId: 202 }] }
  ]
  const adminUser = { id: 1, role: 'admin' }
  const result = filterOrdersForProvider(orders, [], adminUser)
  assert.equal(result.length, 2)
})

test('filterOrdersForProvider filtra únicamente las órdenes que contienen productos del proveedor', () => {
  const orders = [
    { id: 1, items: [{ productId: 101 }, { productId: 102 }] },
    { id: 2, items: [{ productId: 201 }] },
    { id: 3, items: [{ productId: 102 }, { productId: 301 }] }
  ]
  const providerProducts = [
    { id: 101, name: 'Hierro 12mm' },
    { id: 102, name: 'Chapa C25' }
  ]
  const providerUser = { id: 5, role: 'provider', providerId: 'prov-1' }

  const result = filterOrdersForProvider(orders, providerProducts, providerUser)
  // Orden 1 tiene 101 y 102 (pasa)
  // Orden 2 tiene 201 (no pasa)
  // Orden 3 tiene 102 (pasa)
  assert.equal(result.length, 2)
  assert.deepEqual(result.map(o => o.id), [1, 3])
})

test('filterOrdersForProvider devuelve array vacío si el proveedor no tiene ítems en las órdenes', () => {
  const orders = [
    { id: 1, items: [{ productId: 999 }] }
  ]
  const providerProducts = [{ id: 101 }]
  const providerUser = { id: 5, role: 'provider', providerId: 'prov-1' }

  const result = filterOrdersForProvider(orders, providerProducts, providerUser)
  assert.equal(result.length, 0)
})
