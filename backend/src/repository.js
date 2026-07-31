import { getPool, isPostgresEnabled } from './db.js'
import { nextId, readDb, writeDb } from './store.js'
import { randomBytes } from 'crypto'

function mapProductRow(row) {
  const normalizedCurrency = String(row.currency || 'UYU').toUpperCase()
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    category: row.category,
    company: row.company,
    providerId: Number(row.provider_id ?? row.providerId),
    price: Number(row.price),
    currency: normalizedCurrency === 'USD' ? 'USD' : 'UYU',
    unit: row.unit,
    stock: Number(row.stock),
    color: row.color,
    images: Array.isArray(row.images) ? row.images : [],
    sku: row.sku || '',
    status: row.status || 'published',
    productType: row.product_type ?? row.productType ?? 'ready',
    leadTimeDays: Number(row.lead_time_days ?? row.leadTimeDays ?? 3),
    weightKg: row.weight_kg ?? row.weightKg ? Number(row.weight_kg ?? row.weightKg) : null,
    dimensions: row.dimensions && typeof row.dimensions === 'object' ? row.dimensions : {},
    configurable: Boolean(row.configurable),
    variants: Array.isArray(row.variants) ? row.variants : [],
  }
}

function mapProviderRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    zone: row.zone,
    phone: row.phone,
    rating: Number(row.rating ?? 0),
    reviews: Number(row.reviews ?? 0),
  }
}

function mapCustomRequestRow(row) {
  return {
    id: Number(row.id),
    productId: Number(row.product_id ?? row.productId),
    productName: row.product_name ?? row.productName,
    name: row.customer_name ?? row.name,
    email: row.email,
    phone: row.phone,
    zone: row.zone,
    configuration: {
      size: row.size,
      color: row.color,
      finish: row.finish,
    },
    message: row.message || '',
    photos: Array.isArray(row.photos) ? row.photos : [],
    status: row.status || 'new',
    createdAt: row.created_at ?? row.createdAt,
  }
}

function mapUserRow(row) {
  const rawProviderId = row.provider_id ?? row.providerId
  return {
    id: Number(row.id),
    email: row.email,
    password: row.password,
    role: row.role,
    providerId:
      rawProviderId === null || rawProviderId === undefined || rawProviderId === ''
        ? null
        : Number(rawProviderId),
    company: row.company,
  }
}

function generateTrackingToken() {
  return randomBytes(16).toString('hex')
}

function mapNotificationLogRow(row) {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id ?? row.orderId),
    channel: row.channel,
    sent: Boolean(row.sent),
    reason: row.reason || '',
    createdAt: row.created_at ?? row.createdAt,
  }
}

function mapLeadRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    zone: row.zone,
    plan: row.plan,
    message: row.message || '',
    createdAt: row.created_at ?? row.createdAt,
  }
}

async function getJsonRepo() {
  return {
    async findUserByCredentials(email, password) {
      const db = readDb()
      const user = db.users.find((u) => u.email === email && u.password === password)
      return user || null
    },
    async findUserByEmail(email) {
      const db = readDb()
      return db.users.find((u) => u.email === email) || null
    },
    async findUserById(id) {
      const db = readDb()
      return db.users.find((u) => Number(u.id) === Number(id)) || null
    },
    async createUser(payload) {
      const db = readDb()
      const created = {
        id: nextId(db.users),
        email: payload.email,
        password: payload.password,
        role: payload.role || 'customer',
        providerId: payload.providerId ?? null,
        company: payload.company || '',
      }
      db.users.push(created)
      writeDb(db)
      return created
    },
    async getProviders() {
      return readDb().providers
    },
    async getProviderProducts(providerId) {
      return readDb().products.filter((p) => Number(p.providerId) === Number(providerId))
    },
    async getProducts(filters = {}) {
      const db = readDb()
      let items = [...db.products]
      const { q, category, providerId, stock } = filters
      if (q) {
        const term = String(q).trim().toLowerCase()
        items = items.filter((p) => [p.name, p.description, p.category, p.company].join(' ').toLowerCase().includes(term))
      }
      if (category) items = items.filter((p) => p.category === category)
      if (providerId) items = items.filter((p) => Number(p.providerId) === Number(providerId))
      if (stock === 'in') items = items.filter((p) => Number(p.stock) > 0)
      if (stock === 'out') items = items.filter((p) => Number(p.stock) <= 0)
      return items
    },
    async getProductById(id) {
      return readDb().products.find((p) => Number(p.id) === Number(id)) || null
    },
    async createProduct(payload) {
      const db = readDb()
      const created = {
        ...payload,
        currency: String(payload.currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU',
        id: nextId(db.products),
      }
      db.products.push(created)
      writeDb(db)
      return created
    },
    async updateProduct(id, updates) {
      const db = readDb()
      const index = db.products.findIndex((p) => Number(p.id) === Number(id))
      if (index === -1) return null
      db.products[index] = { ...db.products[index], ...updates, id: db.products[index].id }
      writeDb(db)
      return db.products[index]
    },
    async deleteProduct(id) {
      const db = readDb()
      const exists = db.products.some((p) => Number(p.id) === Number(id))
      if (!exists) return false
      db.products = db.products.filter((p) => Number(p.id) !== Number(id))
      writeDb(db)
      return true
    },
    async createOrder({
      items,
      buyerName,
      buyerPhone,
      buyerEmail = '',
      deliveryMethod = 'delivery',
      deliveryAddress = '',
      deliveryCity = '',
      buyerNotes = '',
      paymentMethod = '',
    }) {
      const db = readDb()
      for (const item of items) {
        const product = db.products.find((p) => Number(p.id) === Number(item.productId))
        if (!product) throw new Error(`Producto inexistente: ${item.productId}`)
        if (Number(product.stock) < item.quantity) throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`)
      }
      for (const item of items) {
        const idx = db.products.findIndex((p) => Number(p.id) === Number(item.productId))
        db.products[idx].stock = Number(db.products[idx].stock) - item.quantity
      }
      const order = {
        id: nextId(db.orders),
        items,
        buyerName,
        buyerPhone,
        buyerEmail,
        deliveryMethod,
        deliveryAddress,
        deliveryCity,
        buyerNotes,
        paymentMethod,
        paymentStatus: paymentMethod === 'mercadopago' ? 'pending' : 'not_required',
        paymentProvider: paymentMethod === 'mercadopago' ? 'mercadopago' : '',
        paymentExternalId: '',
        paymentPreferenceId: '',
        status: 'pending',
        trackingToken: generateTrackingToken(),
        createdAt: new Date().toISOString(),
      }
      db.orders.push(order)
      writeDb(db)
      return order
    },
    async getOrders() {
      const db = readDb()
      const notificationLogs = Array.isArray(db.notificationLogs) ? db.notificationLogs : []

      return db.orders.map((order) => {
        const latestNotification = notificationLogs
          .filter((log) => Number(log.orderId) === Number(order.id))
          .sort((a, b) => Number(b.id) - Number(a.id))[0]

        return {
          ...order,
          paymentStatus: order.paymentStatus || 'not_required',
          paymentProvider: order.paymentProvider || '',
          paymentExternalId: order.paymentExternalId || '',
          paymentPreferenceId: order.paymentPreferenceId || '',
          latestNotification: latestNotification || null,
        }
      })
    },
    async getOrderById(id) {
      const db = readDb()
      const order = db.orders.find((current) => Number(current.id) === Number(id))
      if (!order) return null
      return {
        ...order,
        paymentStatus: order.paymentStatus || 'not_required',
        paymentProvider: order.paymentProvider || '',
        paymentExternalId: order.paymentExternalId || '',
        paymentPreferenceId: order.paymentPreferenceId || '',
      }
    },
    async recordOrderNotification(orderId, notification) {
      const db = readDb()
      if (!Array.isArray(db.notificationLogs)) {
        db.notificationLogs = []
      }

      const created = {
        id: nextId(db.notificationLogs),
        orderId: Number(orderId),
        channel: notification.channel || 'unknown',
        sent: Boolean(notification.sent),
        reason: notification.reason || '',
        createdAt: new Date().toISOString(),
      }

      db.notificationLogs.push(created)
      writeDb(db)
      return created
    },
    async getOrderNotificationLogs(orderId) {
      const db = readDb()
      if (!Array.isArray(db.notificationLogs)) {
        return []
      }

      return db.notificationLogs
        .filter((log) => Number(log.orderId) === Number(orderId))
        .sort((a, b) => Number(b.id) - Number(a.id))
    },
    async updateOrderStatus(id, status) {
      const db = readDb()
      const index = db.orders.findIndex((order) => Number(order.id) === Number(id))
      if (index === -1) return null
      db.orders[index] = {
        ...db.orders[index],
        status,
      }
      writeDb(db)
      return db.orders[index]
    },
    async updateOrderPayment(id, updates = {}) {
      const db = readDb()
      const index = db.orders.findIndex((order) => Number(order.id) === Number(id))
      if (index === -1) return null

      db.orders[index] = {
        ...db.orders[index],
        paymentStatus: updates.paymentStatus ?? db.orders[index].paymentStatus ?? 'pending',
        paymentProvider: updates.paymentProvider ?? db.orders[index].paymentProvider ?? '',
        paymentExternalId: updates.paymentExternalId ?? db.orders[index].paymentExternalId ?? '',
        paymentPreferenceId: updates.paymentPreferenceId ?? db.orders[index].paymentPreferenceId ?? '',
      }

      writeDb(db)
      return db.orders[index]
    },
    async restoreOrderStock(id) {
      const db = readDb()
      const index = db.orders.findIndex((order) => Number(order.id) === Number(id))
      if (index === -1 || db.orders[index].stockReleased) return false

      for (const item of db.orders[index].items || []) {
        const productIndex = db.products.findIndex((product) => Number(product.id) === Number(item.productId))
        if (productIndex >= 0) {
          db.products[productIndex].stock = Number(db.products[productIndex].stock || 0) + Number(item.quantity || 0)
        }
      }
      db.orders[index].stockReleased = true
      writeDb(db)
      return true
    },
    async getOrderByTracking(trackingToken, buyerPhone) {
      const db = readDb()
      const notificationLogs = Array.isArray(db.notificationLogs) ? db.notificationLogs : []
      const order =
        db.orders.find(
          (current) =>
            String(current.trackingToken || '') === String(trackingToken || '') &&
            String(current.buyerPhone || '').replace(/\D/g, '') === String(buyerPhone || '').replace(/\D/g, '')
        ) || null

      if (!order) return null

      const items = (order.items || []).map((item) => {
        const product = db.products.find((p) => Number(p.id) === Number(item.productId))
        return {
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          name: product?.name,
          company: product?.company,
          unit: product?.unit,
          price: product?.price !== undefined ? Number(product.price) : undefined,
          currency: String(product?.currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU',
        }
      })

      return {
        ...order,
        paymentStatus: order.paymentStatus || 'not_required',
        paymentProvider: order.paymentProvider || '',
        paymentExternalId: order.paymentExternalId || '',
        paymentPreferenceId: order.paymentPreferenceId || '',
        items,
        latestNotification: notificationLogs
          .filter((log) => Number(log.orderId) === Number(order.id))
          .sort((a, b) => Number(b.id) - Number(a.id))[0] || null,
      }
    },
    async createCustomRequest(payload) {
      const db = readDb()
      if (!Array.isArray(db.customRequests)) db.customRequests = []
      const created = {
        ...payload,
        id: nextId(db.customRequests),
        status: 'new',
        createdAt: new Date().toISOString(),
      }
      db.customRequests.unshift(created)
      writeDb(db)
      return created
    },
    async getCustomRequests() {
      const db = readDb()
      return Array.isArray(db.customRequests) ? db.customRequests : []
    },
    async updateCustomRequestStatus(id, status) {
      const db = readDb()
      if (!Array.isArray(db.customRequests)) return null
      const index = db.customRequests.findIndex((item) => Number(item.id) === Number(id))
      if (index === -1) return null
      db.customRequests[index] = { ...db.customRequests[index], status }
      writeDb(db)
      return db.customRequests[index]
    },
    async createLead(payload) {
      const db = readDb()

      if (!Array.isArray(db.leads)) {
        db.leads = []
      }

      const created = {
        id: nextId(db.leads),
        name: payload.name,
        company: payload.company,
        email: payload.email,
        phone: payload.phone,
        zone: payload.zone,
        plan: payload.plan,
        message: payload.message || '',
        createdAt: new Date().toISOString(),
      }

      db.leads.push(created)

      if (!Array.isArray(db.quoteConsultations)) {
        db.quoteConsultations = []
      }

      db.quoteConsultations.push({
        id: nextId(db.quoteConsultations),
        eventType: 'lead',
        source: payload.source || 'landing-lead',
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        zone: payload.zone,
        projectType: payload.projectType || '',
        budgetRange: payload.budgetRange || '',
        paymentPreference: payload.paymentPreference || '',
        message: payload.message || '',
        searchTerm: '',
        leadId: created.id,
        searchContactId: null,
        createdAt: created.createdAt,
      })

      writeDb(db)
      return created
    },
    async createSearchContact(payload) {
      const db = readDb()

      if (!Array.isArray(db.searchContacts)) {
        db.searchContacts = []
      }

      const created = {
        id: nextId(db.searchContacts),
        searchTerm: payload.searchTerm,
        name: payload.name || '',
        email: payload.email || '',
        phone: payload.phone || '',
        source: payload.source || 'featured-search',
        createdAt: new Date().toISOString(),
      }

      db.searchContacts.push(created)

      if (!Array.isArray(db.quoteConsultations)) {
        db.quoteConsultations = []
      }

      db.quoteConsultations.push({
        id: nextId(db.quoteConsultations),
        eventType: 'search_contact',
        source: payload.source || 'featured-search',
        name: payload.name || '',
        email: payload.email || '',
        phone: payload.phone || '',
        zone: '',
        projectType: '',
        budgetRange: '',
        paymentPreference: '',
        message: '',
        searchTerm: payload.searchTerm,
        leadId: null,
        searchContactId: created.id,
        createdAt: created.createdAt,
      })

      writeDb(db)
      return created
    },
    async getQuoteConsultations(filters = {}) {
      const db = readDb()
      const rows = Array.isArray(db.quoteConsultations) ? [...db.quoteConsultations] : []

      let filtered = rows

      if (filters.from) {
        const fromTs = new Date(filters.from).getTime()
        if (!Number.isNaN(fromTs)) {
          filtered = filtered.filter((row) => new Date(row.createdAt).getTime() >= fromTs)
        }
      }

      if (filters.to) {
        const toTs = new Date(filters.to).getTime()
        if (!Number.isNaN(toTs)) {
          filtered = filtered.filter((row) => new Date(row.createdAt).getTime() <= toTs)
        }
      }

      if (filters.source) {
        filtered = filtered.filter((row) => String(row.source || '') === String(filters.source))
      }

      if (filters.eventType) {
        filtered = filtered.filter((row) => String(row.eventType || '') === String(filters.eventType))
      }

      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },
  }
}

async function getPgRepo() {
  const pool = getPool()
  return {
    async findUserByCredentials(email, password) {
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2 LIMIT 1', [email, password])
      return rows[0] ? mapUserRow(rows[0]) : null
    },
    async findUserByEmail(email) {
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
      return rows[0] ? mapUserRow(rows[0]) : null
    },
    async findUserById(id) {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id])
      return rows[0] ? mapUserRow(rows[0]) : null
    },
    async createUser(payload) {
      const { rows } = await pool.query(
        `INSERT INTO users (email, password, role, provider_id, company)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          payload.email,
          payload.password,
          payload.role || 'customer',
          payload.providerId ?? null,
          payload.company || '',
        ]
      )
      return mapUserRow(rows[0])
    },
    async getProviders() {
      const { rows } = await pool.query('SELECT * FROM providers ORDER BY name ASC')
      return rows.map(mapProviderRow)
    },
    async getProviderProducts(providerId) {
      const { rows } = await pool.query('SELECT * FROM products WHERE provider_id = $1 ORDER BY id DESC', [providerId])
      return rows.map(mapProductRow)
    },
    async getProducts(filters = {}) {
      const values = []
      const clauses = []
      if (filters.q) {
        values.push(`%${String(filters.q).trim().toLowerCase()}%`)
        clauses.push(`LOWER(CONCAT(name, ' ', description, ' ', category, ' ', company)) LIKE $${values.length}`)
      }
      if (filters.category) {
        values.push(filters.category)
        clauses.push(`category = $${values.length}`)
      }
      if (filters.providerId) {
        values.push(Number(filters.providerId))
        clauses.push(`provider_id = $${values.length}`)
      }
      if (filters.stock === 'in') clauses.push('stock > 0')
      if (filters.stock === 'out') clauses.push('stock <= 0')
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const { rows } = await pool.query(`SELECT * FROM products ${where} ORDER BY id DESC`, values)
      return rows.map(mapProductRow)
    },
    async getProductById(id) {
      const { rows } = await pool.query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id])
      return rows[0] ? mapProductRow(rows[0]) : null
    },
    async createProduct(payload) {
      const { rows } = await pool.query(
        `INSERT INTO products
          (name, description, category, company, provider_id, price, currency, unit, stock, color, images,
           sku, status, product_type, lead_time_days, weight_kg, dimensions, configurable, variants)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          payload.name, payload.description, payload.category, payload.company, payload.providerId,
          payload.price, payload.currency || 'UYU', payload.unit, payload.stock, payload.color,
          JSON.stringify(payload.images || []), payload.sku || null, payload.status || 'published',
          payload.productType || 'ready', payload.leadTimeDays || 3, payload.weightKg || null,
          JSON.stringify(payload.dimensions || {}), Boolean(payload.configurable),
          JSON.stringify(payload.variants || []),
        ]
      )
      return mapProductRow(rows[0])
    },
    async updateProduct(id, updates) {
      const current = await this.getProductById(id)
      if (!current) return null
      const merged = { ...current, ...updates }
      const { rows } = await pool.query(
        `UPDATE products
         SET name=$1, description=$2, category=$3, company=$4, provider_id=$5, price=$6, currency=$7,
             unit=$8, stock=$9, color=$10, images=$11, sku=$12, status=$13, product_type=$14,
             lead_time_days=$15, weight_kg=$16, dimensions=$17, configurable=$18, variants=$19
         WHERE id=$20
         RETURNING *`,
        [
          merged.name, merged.description, merged.category, merged.company, merged.providerId,
          merged.price, merged.currency || 'UYU', merged.unit, merged.stock, merged.color,
          JSON.stringify(merged.images || []), merged.sku || null, merged.status || 'published',
          merged.productType || 'ready', merged.leadTimeDays || 3, merged.weightKg || null,
          JSON.stringify(merged.dimensions || {}), Boolean(merged.configurable),
          JSON.stringify(merged.variants || []), id,
        ]
      )
      return mapProductRow(rows[0])
    },
    async deleteProduct(id) {
      const result = await pool.query('DELETE FROM products WHERE id = $1', [id])
      return result.rowCount > 0
    },
    async createOrder({
      items,
      buyerName,
      buyerPhone,
      buyerEmail = '',
      deliveryMethod = 'delivery',
      deliveryAddress = '',
      deliveryCity = '',
      buyerNotes = '',
      paymentMethod = '',
    }) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (const item of items) {
          const { rows } = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.productId])
          const product = rows[0]
          if (!product) throw new Error(`Producto inexistente: ${item.productId}`)
          if (Number(product.stock) < item.quantity) throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`)
        }
        const orderResult = await client.query(
          `INSERT INTO orders
            (buyer_name, buyer_phone, buyer_email, delivery_method, delivery_address, delivery_city,
             buyer_notes, payment_method, payment_status, payment_provider, status, tracking_token)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [
            buyerName,
            buyerPhone,
            buyerEmail,
            deliveryMethod,
            deliveryAddress || null,
            deliveryCity || null,
            buyerNotes || null,
            paymentMethod,
            paymentMethod === 'mercadopago' ? 'pending' : 'not_required',
            paymentMethod === 'mercadopago' ? 'mercadopago' : null,
            'pending',
            generateTrackingToken(),
          ]
        )
        const order = orderResult.rows[0]
        for (const item of items) {
          await client.query('INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)', [order.id, item.productId, item.quantity])
          await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.productId])
        }
        await client.query('COMMIT')
        return {
          id: Number(order.id),
          items,
          buyerName: order.buyer_name,
          buyerPhone: order.buyer_phone,
          buyerEmail: order.buyer_email || '',
          deliveryMethod: order.delivery_method || 'delivery',
          deliveryAddress: order.delivery_address || '',
          deliveryCity: order.delivery_city || '',
          buyerNotes: order.buyer_notes || '',
          paymentMethod: order.payment_method,
          paymentStatus: order.payment_status || 'not_required',
          paymentProvider: order.payment_provider || '',
          paymentExternalId: order.payment_external_id || '',
          paymentPreferenceId: order.payment_preference_id || '',
          status: order.status,
          trackingToken: order.tracking_token,
          createdAt: order.created_at,
        }
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async getOrders() {
      const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC')
      const results = []
      for (const row of rows) {
        const itemsResult = await pool.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1 ORDER BY id ASC', [row.id])
        const latestNotificationResult = await pool.query(
          'SELECT * FROM notification_logs WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
          [row.id]
        )

        results.push({
          id: Number(row.id),
          items: itemsResult.rows.map((item) => ({ productId: Number(item.product_id), quantity: Number(item.quantity) })),
          buyerName: row.buyer_name,
          buyerPhone: row.buyer_phone,
          buyerEmail: row.buyer_email || '',
          deliveryMethod: row.delivery_method || 'delivery',
          deliveryAddress: row.delivery_address || '',
          deliveryCity: row.delivery_city || '',
          buyerNotes: row.buyer_notes || '',
          paymentMethod: row.payment_method,
          paymentStatus: row.payment_status || 'not_required',
          paymentProvider: row.payment_provider || '',
          paymentExternalId: row.payment_external_id || '',
          paymentPreferenceId: row.payment_preference_id || '',
          status: row.status,
          trackingToken: row.tracking_token,
          createdAt: row.created_at,
          latestNotification: latestNotificationResult.rows[0]
            ? mapNotificationLogRow(latestNotificationResult.rows[0])
            : null,
        })
      }
      return results
    },
    async recordOrderNotification(orderId, notification) {
      const { rows } = await pool.query(
        `INSERT INTO notification_logs (order_id, channel, sent, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          Number(orderId),
          notification.channel || 'unknown',
          Boolean(notification.sent),
          notification.reason || '',
        ]
      )

      return mapNotificationLogRow(rows[0])
    },
    async getOrderNotificationLogs(orderId) {
      const { rows } = await pool.query(
        'SELECT * FROM notification_logs WHERE order_id = $1 ORDER BY created_at DESC',
        [Number(orderId)]
      )
      return rows.map(mapNotificationLogRow)
    },
    async updateOrderStatus(id, status) {
      const { rows } = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      )

      const row = rows[0]
      if (!row) return null

      return {
        id: Number(row.id),
        buyerName: row.buyer_name,
        buyerPhone: row.buyer_phone,
        buyerEmail: row.buyer_email || '',
        deliveryMethod: row.delivery_method || 'delivery',
        deliveryAddress: row.delivery_address || '',
        deliveryCity: row.delivery_city || '',
        buyerNotes: row.buyer_notes || '',
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status || 'not_required',
        paymentProvider: row.payment_provider || '',
        paymentExternalId: row.payment_external_id || '',
        paymentPreferenceId: row.payment_preference_id || '',
        status: row.status,
        trackingToken: row.tracking_token,
        createdAt: row.created_at,
      }
    },
    async getOrderById(id) {
      const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [Number(id)])
      const row = rows[0]
      if (!row) return null

      return {
        id: Number(row.id),
        buyerName: row.buyer_name,
        buyerPhone: row.buyer_phone,
        buyerEmail: row.buyer_email || '',
        deliveryMethod: row.delivery_method || 'delivery',
        deliveryAddress: row.delivery_address || '',
        deliveryCity: row.delivery_city || '',
        buyerNotes: row.buyer_notes || '',
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status || 'not_required',
        paymentProvider: row.payment_provider || '',
        paymentExternalId: row.payment_external_id || '',
        paymentPreferenceId: row.payment_preference_id || '',
        status: row.status,
        trackingToken: row.tracking_token,
        createdAt: row.created_at,
      }
    },
    async updateOrderPayment(id, updates = {}) {
      const { rows } = await pool.query(
        `UPDATE orders
         SET payment_status = COALESCE($1, payment_status),
             payment_provider = COALESCE($2, payment_provider),
             payment_external_id = COALESCE($3, payment_external_id),
             payment_preference_id = COALESCE($4, payment_preference_id)
         WHERE id = $5
         RETURNING *`,
        [
          updates.paymentStatus ?? null,
          updates.paymentProvider ?? null,
          updates.paymentExternalId ?? null,
          updates.paymentPreferenceId ?? null,
          Number(id),
        ]
      )

      const row = rows[0]
      if (!row) return null

      return {
        id: Number(row.id),
        buyerName: row.buyer_name,
        buyerPhone: row.buyer_phone,
        buyerEmail: row.buyer_email || '',
        deliveryMethod: row.delivery_method || 'delivery',
        deliveryAddress: row.delivery_address || '',
        deliveryCity: row.delivery_city || '',
        buyerNotes: row.buyer_notes || '',
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status || 'not_required',
        paymentProvider: row.payment_provider || '',
        paymentExternalId: row.payment_external_id || '',
        paymentPreferenceId: row.payment_preference_id || '',
        status: row.status,
        trackingToken: row.tracking_token,
        createdAt: row.created_at,
      }
    },
    async restoreOrderStock(id) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const orderResult = await client.query(
          'SELECT stock_released FROM orders WHERE id = $1 FOR UPDATE',
          [Number(id)]
        )
        if (!orderResult.rows[0] || orderResult.rows[0].stock_released) {
          await client.query('ROLLBACK')
          return false
        }

        const itemsResult = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [Number(id)]
        )
        for (const item of itemsResult.rows) {
          await client.query(
            'UPDATE products SET stock = stock + $1 WHERE id = $2',
            [Number(item.quantity), Number(item.product_id)]
          )
        }
        await client.query('UPDATE orders SET stock_released = TRUE WHERE id = $1', [Number(id)])
        await client.query('COMMIT')
        return true
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async getOrderByTracking(trackingToken, buyerPhone) {
      const { rows } = await pool.query(
        'SELECT * FROM orders WHERE tracking_token = $1 AND buyer_phone = $2 LIMIT 1',
        [trackingToken, buyerPhone]
      )

      const row = rows[0]
      if (!row) return null

      const itemsResult = await pool.query(
        `SELECT oi.product_id, oi.quantity, p.name, p.company, p.unit, p.price, p.currency
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1
         ORDER BY oi.id ASC`,
        [row.id]
      )

      const latestNotificationResult = await pool.query(
        'SELECT * FROM notification_logs WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
        [row.id]
      )

      return {
        id: Number(row.id),
        items: itemsResult.rows.map((item) => ({
          productId: Number(item.product_id),
          quantity: Number(item.quantity),
          name: item.name,
          company: item.company,
          unit: item.unit,
          price: Number(item.price),
          currency: String(item.currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU',
        })),
        buyerName: row.buyer_name,
        buyerPhone: row.buyer_phone,
        buyerEmail: row.buyer_email || '',
        deliveryMethod: row.delivery_method || 'delivery',
        deliveryAddress: row.delivery_address || '',
        deliveryCity: row.delivery_city || '',
        buyerNotes: row.buyer_notes || '',
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status || 'not_required',
        paymentProvider: row.payment_provider || '',
        paymentExternalId: row.payment_external_id || '',
        paymentPreferenceId: row.payment_preference_id || '',
        status: row.status,
        trackingToken: row.tracking_token,
        createdAt: row.created_at,
        latestNotification: latestNotificationResult.rows[0]
          ? mapNotificationLogRow(latestNotificationResult.rows[0])
          : null,
      }
    },
    async createCustomRequest(payload) {
      const { rows } = await pool.query(
        `INSERT INTO custom_requests
          (product_id, product_name, customer_name, email, phone, zone, size, color, finish, message, photos)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          payload.productId,
          payload.productName,
          payload.name,
          payload.email,
          payload.phone,
          payload.zone,
          payload.configuration.size,
          payload.configuration.color,
          payload.configuration.finish,
          payload.message || '',
          JSON.stringify(payload.photos || []),
        ]
      )
      return mapCustomRequestRow(rows[0])
    },
    async getCustomRequests() {
      const { rows } = await pool.query('SELECT * FROM custom_requests ORDER BY created_at DESC')
      return rows.map(mapCustomRequestRow)
    },
    async updateCustomRequestStatus(id, status) {
      const { rows } = await pool.query(
        'UPDATE custom_requests SET status = $1 WHERE id = $2 RETURNING *',
        [status, Number(id)]
      )
      return rows[0] ? mapCustomRequestRow(rows[0]) : null
    },
    async createLead(payload) {
      const { rows } = await pool.query(
        `INSERT INTO leads (name, company, email, phone, zone, plan, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          payload.name,
          payload.company,
          payload.email,
          payload.phone,
          payload.zone,
          payload.plan,
          payload.message || '',
        ]
      )

      const created = mapLeadRow(rows[0])

      await pool.query(
        `INSERT INTO quote_consultations (
          event_type,
          source,
          name,
          email,
          phone,
          zone,
          project_type,
          budget_range,
          payment_preference,
          message,
          lead_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          'lead',
          payload.source || 'landing-lead',
          payload.name,
          payload.email,
          payload.phone,
          payload.zone,
          payload.projectType || null,
          payload.budgetRange || null,
          payload.paymentPreference || null,
          payload.message || null,
          created.id,
        ]
      )

      return created
    },
    async createSearchContact(payload) {
      const { rows } = await pool.query(
        `INSERT INTO search_contacts (search_term, email, phone, source)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          payload.searchTerm,
          payload.email || null,
          payload.phone || null,
          payload.source || 'featured-search',
        ]
      )

      const created = {
        id: Number(rows[0].id),
        searchTerm: rows[0].search_term,
        name: payload.name || '',
        email: rows[0].email || '',
        phone: rows[0].phone || '',
        source: rows[0].source || 'featured-search',
        createdAt: rows[0].created_at,
      }

      await pool.query(
        `INSERT INTO quote_consultations (
          event_type,
          source,
          name,
          email,
          phone,
          search_term,
          search_contact_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'search_contact',
          payload.source || 'featured-search',
          payload.name || null,
          payload.email || null,
          payload.phone || null,
          payload.searchTerm,
          created.id,
        ]
      )

      return created
    },
    async getQuoteConsultations(filters = {}) {
      const values = []
      const clauses = []

      if (filters.from) {
        values.push(filters.from)
        clauses.push(`created_at >= $${values.length}`)
      }

      if (filters.to) {
        values.push(filters.to)
        clauses.push(`created_at <= $${values.length}`)
      }

      if (filters.source) {
        values.push(filters.source)
        clauses.push(`source = $${values.length}`)
      }

      if (filters.eventType) {
        values.push(filters.eventType)
        clauses.push(`event_type = $${values.length}`)
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const { rows } = await pool.query(
        `SELECT * FROM quote_consultations ${where} ORDER BY created_at DESC LIMIT 2000`,
        values
      )

      return rows.map((row) => ({
        id: Number(row.id),
        eventType: row.event_type,
        source: row.source,
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        zone: row.zone || '',
        projectType: row.project_type || '',
        budgetRange: row.budget_range || '',
        paymentPreference: row.payment_preference || '',
        message: row.message || '',
        searchTerm: row.search_term || '',
        leadId: row.lead_id ? Number(row.lead_id) : null,
        searchContactId: row.search_contact_id ? Number(row.search_contact_id) : null,
        createdAt: row.created_at,
      }))
    },
  }
}

export async function getRepository() {
  if (isPostgresEnabled()) {
    return getPgRepo()
  }
  return getJsonRepo()
}
