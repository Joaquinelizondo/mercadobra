import { NotFoundError } from './errors.js'

/**
 * Ensures that the authenticated user has permission to access a B2B project.
 * Admins have full access. Customers can only access projects they own.
 * Any unauthorized attempt raises NotFoundError to prevent resource enumeration (IDOR).
 */
export async function ensureB2bProjectAccess(repo, projectId, authUser) {
  if (!authUser) {
    throw new NotFoundError('Proyecto de obra')
  }
  if (authUser.role === 'admin') {
    const project = await repo.getB2bProjectById(projectId)
    if (!project) throw new NotFoundError('Proyecto de obra')
    return project
  }
  const project = await repo.getB2bProjectById(projectId)
  if (!project || Number(project.customerUserId) !== Number(authUser.id)) {
    throw new NotFoundError('Proyecto de obra')
  }
  return project
}

/**
 * Filters orders so that providers only see orders containing products they sell.
 * Admins can see all orders.
 */
export function filterOrdersForProvider(orders = [], providerProducts = [], authUser = {}) {
  if (authUser?.role === 'admin') {
    return orders
  }
  const providerProductIds = new Set((providerProducts || []).map((p) => Number(p.id)))
  return (orders || []).filter((order) =>
    (order.items || []).some((item) => providerProductIds.has(Number(item.productId)))
  )
}
