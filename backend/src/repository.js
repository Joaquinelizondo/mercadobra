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
    discountPercent: Math.min(99, Math.max(0, Number(row.discount_percent ?? row.discountPercent) || 0)),
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
    ribbonEnabled: Boolean(row.ribbon_enabled ?? row.ribbonEnabled),
    ribbonText: String(row.ribbon_text ?? row.ribbonText ?? ''),
    slideEnabled: Boolean(row.slide_enabled ?? row.slideEnabled),
    slideTitle: String(row.slide_title ?? row.slideTitle ?? ''),
    slideSubtitle: String(row.slide_subtitle ?? row.slideSubtitle ?? ''),
    slideOrder: Number(row.slide_order ?? row.slideOrder ?? 0),
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
    accountStatus: row.account_status ?? row.accountStatus ?? 'active',
  }
}

function mapAdminCustomerRow(row) {
  return {
    id: Number(row.id),
    name: row.name ?? row.company ?? '',
    email: row.email || '',
    phone: row.phone || '',
    companyName: row.company_name ?? row.companyName ?? '',
    address: row.address || '',
    city: row.city || '',
    department: row.department || '',
    status: row.status || 'active',
    internalNotes: row.internal_notes ?? row.internalNotes ?? '',
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    orderCount: Number(row.order_count ?? row.orderCount ?? 0),
    lastOrderAt: row.last_order_at ?? row.lastOrderAt ?? null,
  }
}

function mapQuoteMessageRow(row) {
  return {
    id: Number(row.id),
    quoteId: Number(row.quote_id ?? row.quoteId),
    authorUserId: Number(row.author_user_id ?? row.authorUserId),
    authorRole: row.author_role ?? row.authorRole,
    message: row.message || '',
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: row.created_at ?? row.createdAt ?? null,
  }
}

function mapCustomerQuoteRow(row) {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_user_id ?? row.customerId),
    referenceNumber: row.reference_number ?? row.referenceNumber,
    title: row.title,
    description: row.description || '',
    status: row.status || 'in_progress',
    totalAmount: Number(row.total_amount ?? row.totalAmount ?? 0),
    currency: String(row.currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU',
    sentAt: row.sent_at ?? row.sentAt ?? null,
    estimatedStartAt: row.estimated_start_at ?? row.estimatedStartAt ?? null,
    estimatedEndAt: row.estimated_end_at ?? row.estimatedEndAt ?? null,
    internalNotes: row.internal_notes ?? row.internalNotes ?? '',
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    desiredDate: row.desired_date ?? row.desiredDate ?? null,
    budget: row.budget == null ? null : Number(row.budget),
    proposalDescription: row.proposal_description ?? row.proposalDescription ?? '',
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

function generateTrackingToken() {
  return randomBytes(16).toString('hex')
}

function mapOrderItemRow(item) {
  const storedUnitPrice = item.unit_price ?? item.unitPrice
  const originalPrice = Number(item.price ?? 0)
  const discountPercent = Math.min(99, Math.max(0, Number(item.discount_percent ?? item.discountPercent) || 0))
  const unitPrice = storedUnitPrice == null
    ? Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100
    : Number(storedUnitPrice)
  const quantity = Number(item.quantity)
  return {
    productId: Number(item.product_id ?? item.productId),
    quantity,
    name: item.product_name ?? item.productName ?? item.name ?? '',
    company: item.company || '',
    sku: item.sku || '',
    unit: item.unit || 'unidad',
    price: unitPrice,
    currency: String(item.currency || 'UYU').toUpperCase() === 'USD' ? 'USD' : 'UYU',
    leadTimeDays: Number(item.lead_time_days ?? item.leadTimeDays ?? 0),
    subtotal: unitPrice * quantity,
  }
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
    async findUserByEmail(email) {
      const db = readDb()
      const user = db.users.find((u) => u.email === email) || null
      if (!user) return null
      const profile = (db.customerProfiles || []).find((item) => Number(item.userId) === Number(user.id))
      return { ...user, accountStatus: profile?.status || 'active' }
    },
    async findUserById(id) {
      const db = readDb()
      return db.users.find((u) => Number(u.id) === Number(id)) || null
    },
    async updateUserPassword(id, password) {
      const db = readDb()
      const user = db.users.find((item) => Number(item.id) === Number(id))
      if (!user) return false
      user.password = password
      writeDb(db)
      return true
    },
    async createAuthSession({ userId, tokenHash, expiresAt }) {
      const db = readDb()
      if (!Array.isArray(db.authSessions)) db.authSessions = []
      db.authSessions = db.authSessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now())
      db.authSessions.push({ userId: Number(userId), tokenHash, expiresAt })
      writeDb(db)
    },
    async findUserBySessionTokenHash(tokenHash) {
      const db = readDb()
      const session = (db.authSessions || []).find(
        (item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > Date.now()
      )
      return session ? db.users.find((user) => Number(user.id) === Number(session.userId)) || null : null
    },
    async deleteAuthSession(tokenHash) {
      const db = readDb()
      db.authSessions = (db.authSessions || []).filter((session) => session.tokenHash !== tokenHash)
      writeDb(db)
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
    async getAdminCustomers({ q = '', status = '' } = {}) {
      const db = readDb()
      const profiles = Array.isArray(db.customerProfiles) ? db.customerProfiles : []
      const term = String(q).trim().toLowerCase()
      return db.users
        .filter((user) => user.role === 'customer')
        .map((user) => {
          const profile = profiles.find((item) => Number(item.userId) === Number(user.id)) || {}
          const orders = (db.orders || []).filter((order) => String(order.buyerEmail || '').toLowerCase() === String(user.email).toLowerCase())
          return mapAdminCustomerRow({
            ...profile,
            id: user.id,
            name: user.company || '',
            email: user.email,
            status: profile.status || 'active',
            orderCount: orders.length,
            lastOrderAt: orders.map((order) => order.createdAt).filter(Boolean).sort().at(-1) || null,
          })
        })
        .filter((customer) => (!status || customer.status === status)
          && (!term || [customer.name, customer.email, customer.phone, customer.companyName, customer.city, customer.department]
            .some((value) => String(value || '').toLowerCase().includes(term))))
    },
    async updateAdminCustomer(id, payload) {
      const db = readDb()
      const user = db.users.find((item) => Number(item.id) === Number(id) && item.role === 'customer')
      if (!user) return null
      user.email = payload.email
      user.company = payload.name
      if (!Array.isArray(db.customerProfiles)) db.customerProfiles = []
      const index = db.customerProfiles.findIndex((item) => Number(item.userId) === Number(id))
      const profile = {
        ...(index >= 0 ? db.customerProfiles[index] : {}),
        userId: Number(id),
        phone: payload.phone,
        companyName: payload.companyName,
        address: payload.address,
        city: payload.city,
        department: payload.department,
        status: payload.status,
        internalNotes: payload.internalNotes,
        updatedAt: new Date().toISOString(),
      }
      if (index >= 0) db.customerProfiles[index] = profile
      else db.customerProfiles.push(profile)
      if (payload.status === 'blocked') {
        db.authSessions = (db.authSessions || []).filter((session) => Number(session.userId) !== Number(id))
      }
      writeDb(db)
      return mapAdminCustomerRow({ ...profile, id: user.id, name: user.company, email: user.email })
    },
    async createAdminCustomer(payload) {
      const db = readDb()
      const user = {
        id: nextId(db.users), email: payload.email, password: payload.password,
        role: 'customer', providerId: null, company: payload.name,
      }
      db.users.push(user)
      if (!Array.isArray(db.customerProfiles)) db.customerProfiles = []
      const profile = {
        userId: user.id, phone: payload.phone, companyName: payload.companyName,
        address: payload.address, city: payload.city, department: payload.department,
        status: 'inactive', internalNotes: payload.internalNotes, updatedAt: new Date().toISOString(),
      }
      db.customerProfiles.push(profile)
      writeDb(db)
      return mapAdminCustomerRow({ ...profile, id: user.id, name: user.company, email: user.email })
    },
    async getAdminCustomerById(id) {
      const customers = await this.getAdminCustomers()
      return customers.find((customer) => customer.id === Number(id)) || null
    },
    async getCustomerQuotes(customerId) {
      const db = readDb()
      return (db.customerQuotes || [])
        .filter((quote) => Number(quote.customerId) === Number(customerId))
        .map(mapCustomerQuoteRow)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },
    async createCustomerQuote(payload) {
      const db = readDb()
      if (!Array.isArray(db.customerQuotes)) db.customerQuotes = []
      const created = {
        ...payload,
        id: nextId(db.customerQuotes),
        sentAt: payload.status === 'sent' ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      db.customerQuotes.push(created)
      writeDb(db)
      return mapCustomerQuoteRow(created)
    },
    async updateCustomerQuoteStatus(id, status) {
      const db = readDb()
      const quote = (db.customerQuotes || []).find((item) => Number(item.id) === Number(id))
      if (!quote) return null
      quote.status = status
      if (status === 'sent' && !quote.sentAt) quote.sentAt = new Date().toISOString()
      quote.updatedAt = new Date().toISOString()
      writeDb(db)
      return mapCustomerQuoteRow(quote)
    },
    async updateCustomerQuote(id, updates) {
      const db = readDb()
      const quote = (db.customerQuotes || []).find((item) => Number(item.id) === Number(id))
      if (!quote) return null
      Object.assign(quote, updates, { updatedAt: new Date().toISOString() })
      writeDb(db)
      return mapCustomerQuoteRow(quote)
    },
    async getQuoteMessages(quoteId) {
      return (readDb().customerQuoteMessages || []).filter((item) => Number(item.quoteId) === Number(quoteId)).map(mapQuoteMessageRow)
    },
    async createQuoteMessage(payload) {
      const db = readDb()
      if (!Array.isArray(db.customerQuoteMessages)) db.customerQuoteMessages = []
      const created = { ...payload, id: nextId(db.customerQuoteMessages), createdAt: new Date().toISOString() }
      db.customerQuoteMessages.push(created); writeDb(db); return mapQuoteMessageRow(created)
    },
    async getProviders() {
      return readDb().providers
    },
    async getProviderProducts(providerId) {
      return readDb().products.filter((p) => Number(p.providerId) === Number(providerId) && p.status !== 'archived')
    },
    async getProducts(filters = {}) {
      const db = readDb()
      let items = db.products.filter((product) => product.status !== 'archived')
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
      source = 'web',
    }) {
      const db = readDb()
      const snapshotItems = items.map((item) => {
        const product = db.products.find((p) => Number(p.id) === Number(item.productId))
        if (!product) throw new Error(`Producto inexistente: ${item.productId}`)
        if (Number(product.stock) < item.quantity) throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`)
        return mapOrderItemRow({ ...product, productId: product.id, quantity: item.quantity })
      })
      const currencies = [...new Set(snapshotItems.map((item) => item.currency))]
      if (currencies.length > 1) throw new Error('No se pueden combinar monedas diferentes en un pedido')
      const subtotal = snapshotItems.reduce((sum, item) => sum + item.subtotal, 0)
      for (const item of items) {
        const idx = db.products.findIndex((p) => Number(p.id) === Number(item.productId))
        db.products[idx].stock = Number(db.products[idx].stock) - item.quantity
      }
      const order = {
        id: nextId(db.orders),
        items: snapshotItems,
        buyerName,
        buyerPhone,
        buyerEmail,
        deliveryMethod,
        deliveryAddress,
        deliveryCity,
        buyerNotes,
        paymentMethod,
        source,
        paymentStatus: paymentMethod === 'mercadopago' ? 'pending' : 'not_required',
        paymentProvider: paymentMethod === 'mercadopago' ? 'mercadopago' : '',
        paymentExternalId: '',
        paymentPreferenceId: '',
        status: 'pending',
        trackingToken: generateTrackingToken(),
        subtotal,
        deliveryCost: null,
        total: subtotal,
        currency: currencies[0] || 'UYU',
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
    async findUserByEmail(email) {
      const { rows } = await pool.query(
        `SELECT users.*, COALESCE(customer_profiles.status, 'active') AS account_status
         FROM users LEFT JOIN customer_profiles ON customer_profiles.user_id = users.id
         WHERE users.email = $1 LIMIT 1`,
        [email]
      )
      return rows[0] ? mapUserRow(rows[0]) : null
    },
    async findUserById(id) {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id])
      return rows[0] ? mapUserRow(rows[0]) : null
    },
    async updateUserPassword(id, password) {
      const result = await pool.query('UPDATE users SET password = $1 WHERE id = $2', [password, id])
      return result.rowCount > 0
    },
    async createAuthSession({ userId, tokenHash, expiresAt }) {
      await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()')
      await pool.query(
        'INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [userId, tokenHash, expiresAt]
      )
    },
    async findUserBySessionTokenHash(tokenHash) {
      const { rows } = await pool.query(
        `SELECT users.* FROM auth_sessions
         JOIN users ON users.id = auth_sessions.user_id
         WHERE auth_sessions.token_hash = $1 AND auth_sessions.expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
      )
      return rows[0] ? mapUserRow(rows[0]) : null
    },
    async deleteAuthSession(tokenHash) {
      await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash])
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
    async getAdminCustomers({ q = '', status = '' } = {}) {
      const values = []
      const clauses = ["users.role = 'customer'"]
      if (q) {
        values.push(`%${String(q).trim().toLowerCase()}%`)
        clauses.push(`LOWER(CONCAT_WS(' ', users.company, users.email, customer_profiles.phone, customer_profiles.company_name, customer_profiles.city, customer_profiles.department)) LIKE $${values.length}`)
      }
      if (status) {
        values.push(status)
        clauses.push(`COALESCE(customer_profiles.status, 'active') = $${values.length}`)
      }
      const { rows } = await pool.query(
        `SELECT users.id, users.company AS name, users.email, users.created_at,
                customer_profiles.phone, customer_profiles.company_name, customer_profiles.address,
                customer_profiles.city, customer_profiles.department,
                COALESCE(customer_profiles.status, 'active') AS status,
                customer_profiles.internal_notes, customer_profiles.updated_at,
                COALESCE(order_summary.order_count, 0)::int AS order_count,
                order_summary.last_order_at
         FROM users
         LEFT JOIN customer_profiles ON customer_profiles.user_id = users.id
         LEFT JOIN (
           SELECT LOWER(buyer_email) AS email_key, COUNT(*) AS order_count, MAX(created_at) AS last_order_at
           FROM orders
           WHERE buyer_email IS NOT NULL AND buyer_email <> ''
           GROUP BY LOWER(buyer_email)
         ) AS order_summary ON order_summary.email_key = LOWER(users.email)
         WHERE ${clauses.join(' AND ')}
         ORDER BY users.created_at DESC, users.id DESC`,
        values
      )
      return rows.map(mapAdminCustomerRow)
    },
    async updateAdminCustomer(id, payload) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const { rows: users } = await client.query(
          `UPDATE users SET email = $1, company = $2
           WHERE id = $3 AND role = 'customer'
           RETURNING id, email, company AS name, created_at`,
          [payload.email, payload.name, id]
        )
        if (!users[0]) {
          await client.query('ROLLBACK')
          return null
        }
        const { rows: profiles } = await client.query(
          `INSERT INTO customer_profiles
             (user_id, phone, company_name, address, city, department, status, internal_notes, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             phone=EXCLUDED.phone, company_name=EXCLUDED.company_name, address=EXCLUDED.address,
             city=EXCLUDED.city, department=EXCLUDED.department, status=EXCLUDED.status,
             internal_notes=EXCLUDED.internal_notes, updated_at=NOW()
           RETURNING *`,
          [id, payload.phone, payload.companyName, payload.address, payload.city, payload.department, payload.status, payload.internalNotes]
        )
        if (payload.status === 'blocked') {
          await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [id])
        }
        await client.query('COMMIT')
        return mapAdminCustomerRow({ ...users[0], ...profiles[0] })
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async createAdminCustomer(payload) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const { rows: users } = await client.query(
          `INSERT INTO users (email, password, role, provider_id, company)
           VALUES ($1, $2, 'customer', NULL, $3)
           RETURNING id, email, company AS name, created_at`,
          [payload.email, payload.password, payload.name]
        )
        const { rows: profiles } = await client.query(
          `INSERT INTO customer_profiles
             (user_id, phone, company_name, address, city, department, status, internal_notes)
           VALUES ($1,$2,$3,$4,$5,$6,'inactive',$7)
           RETURNING *`,
          [users[0].id, payload.phone, payload.companyName, payload.address, payload.city, payload.department, payload.internalNotes]
        )
        await client.query('COMMIT')
        return mapAdminCustomerRow({ ...users[0], ...profiles[0] })
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async getAdminCustomerById(id) {
      const { rows } = await pool.query(
        `SELECT users.id, users.company AS name, users.email, users.created_at,
                customer_profiles.phone, customer_profiles.company_name, customer_profiles.address,
                customer_profiles.city, customer_profiles.department,
                COALESCE(customer_profiles.status, 'active') AS status,
                customer_profiles.internal_notes, customer_profiles.updated_at,
                COALESCE(order_summary.order_count, 0)::int AS order_count,
                order_summary.last_order_at
         FROM users
         LEFT JOIN customer_profiles ON customer_profiles.user_id = users.id
         LEFT JOIN (
           SELECT LOWER(buyer_email) AS email_key, COUNT(*) AS order_count, MAX(created_at) AS last_order_at
           FROM orders WHERE buyer_email IS NOT NULL AND buyer_email <> '' GROUP BY LOWER(buyer_email)
         ) AS order_summary ON order_summary.email_key = LOWER(users.email)
         WHERE users.id = $1 AND users.role = 'customer' LIMIT 1`,
        [id]
      )
      return rows[0] ? mapAdminCustomerRow(rows[0]) : null
    },
    async getCustomerQuotes(customerId) {
      const { rows } = await pool.query(
        'SELECT * FROM customer_quotes WHERE customer_user_id = $1 ORDER BY created_at DESC, id DESC',
        [customerId]
      )
      return rows.map(mapCustomerQuoteRow)
    },
    async createCustomerQuote(payload) {
      const { rows } = await pool.query(
        `INSERT INTO customer_quotes
           (customer_user_id, reference_number, title, description, status, total_amount, currency,
            sent_at, estimated_start_at, estimated_end_at, internal_notes, created_by, attachments, desired_date, budget)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [
          payload.customerId, payload.referenceNumber, payload.title, payload.description,
          payload.status, payload.totalAmount, payload.currency,
          payload.status === 'sent' ? new Date() : null,
          payload.estimatedStartAt || null, payload.estimatedEndAt || null,
          payload.internalNotes, payload.createdBy, JSON.stringify(payload.attachments || []),
          payload.desiredDate || null, payload.budget ?? null,
        ]
      )
      return mapCustomerQuoteRow(rows[0])
    },
    async updateCustomerQuoteStatus(id, status) {
      const { rows } = await pool.query(
        `UPDATE customer_quotes
         SET status = $1,
             sent_at = CASE WHEN $1 = 'sent' AND sent_at IS NULL THEN NOW() ELSE sent_at END,
             updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [status, id]
      )
      return rows[0] ? mapCustomerQuoteRow(rows[0]) : null
    },
    async updateCustomerQuote(id, updates) {
      const current = (await pool.query('SELECT * FROM customer_quotes WHERE id=$1', [id])).rows[0]
      if (!current) return null
      const merged = { ...mapCustomerQuoteRow(current), ...updates }
      const { rows } = await pool.query(
        `UPDATE customer_quotes SET title=$1, description=$2, status=$3, total_amount=$4, currency=$5,
         estimated_start_at=$6, estimated_end_at=$7, desired_date=$8, budget=$9, attachments=$10,
         proposal_description=$11,
         sent_at=CASE WHEN $3='sent' AND sent_at IS NULL THEN NOW() ELSE sent_at END, updated_at=NOW()
         WHERE id=$12 RETURNING *`,
        [merged.title, merged.description, merged.status, merged.totalAmount, merged.currency,
          merged.estimatedStartAt || null, merged.estimatedEndAt || null, merged.desiredDate || null,
          merged.budget ?? null, JSON.stringify(merged.attachments || []), merged.proposalDescription || '', id]
      )
      return mapCustomerQuoteRow(rows[0])
    },
    async getQuoteMessages(quoteId) {
      const { rows } = await pool.query('SELECT * FROM customer_quote_messages WHERE quote_id=$1 ORDER BY created_at ASC, id ASC', [quoteId])
      return rows.map(mapQuoteMessageRow)
    },
    async createQuoteMessage(payload) {
      const { rows } = await pool.query(
        `INSERT INTO customer_quote_messages (quote_id, author_user_id, author_role, message, attachments)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [payload.quoteId, payload.authorUserId, payload.authorRole, payload.message, JSON.stringify(payload.attachments || [])]
      )
      return mapQuoteMessageRow(rows[0])
    },
    async getProviders() {
      const { rows } = await pool.query('SELECT * FROM providers ORDER BY name ASC')
      return rows.map(mapProviderRow)
    },
    async getProviderProducts(providerId) {
      const { rows } = await pool.query(
        `SELECT * FROM products
         WHERE provider_id = $1 AND status <> 'archived'
         ORDER BY id DESC`,
        [providerId]
      )
      return rows.map(mapProductRow)
    },
    async getProducts(filters = {}) {
      const values = []
      const clauses = [`status <> 'archived'`]
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
          (name, description, category, company, provider_id, price, discount_percent, currency, unit, stock, color, images,
           sku, status, product_type, lead_time_days, weight_kg, dimensions, configurable, variants,
           ribbon_enabled, ribbon_text, slide_enabled, slide_title, slide_subtitle, slide_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
         RETURNING *`,
        [
          payload.name, payload.description, payload.category, payload.company, payload.providerId,
          payload.price, payload.discountPercent || 0, payload.currency || 'UYU', payload.unit, payload.stock, payload.color,
          JSON.stringify(payload.images || []), payload.sku || null, payload.status || 'published',
          payload.productType || 'ready', payload.leadTimeDays || 3, payload.weightKg || null,
          JSON.stringify(payload.dimensions || {}), Boolean(payload.configurable),
          JSON.stringify(payload.variants || []),
          Boolean(payload.ribbonEnabled), payload.ribbonText || '',
          Boolean(payload.slideEnabled), payload.slideTitle || '', payload.slideSubtitle || '', payload.slideOrder || 0,
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
         SET name=$1, description=$2, category=$3, company=$4, provider_id=$5, price=$6, discount_percent=$7, currency=$8,
             unit=$9, stock=$10, color=$11, images=$12, sku=$13, status=$14, product_type=$15,
             lead_time_days=$16, weight_kg=$17, dimensions=$18, configurable=$19, variants=$20,
             ribbon_enabled=$21, ribbon_text=$22, slide_enabled=$23, slide_title=$24,
             slide_subtitle=$25, slide_order=$26
         WHERE id=$27
         RETURNING *`,
        [
          merged.name, merged.description, merged.category, merged.company, merged.providerId,
          merged.price, merged.discountPercent || 0, merged.currency || 'UYU', merged.unit, merged.stock, merged.color,
          JSON.stringify(merged.images || []), merged.sku || null, merged.status || 'published',
          merged.productType || 'ready', merged.leadTimeDays || 3, merged.weightKg || null,
          JSON.stringify(merged.dimensions || {}), Boolean(merged.configurable),
          JSON.stringify(merged.variants || []), Boolean(merged.ribbonEnabled), merged.ribbonText || '',
          Boolean(merged.slideEnabled), merged.slideTitle || '', merged.slideSubtitle || '', merged.slideOrder || 0, id,
        ]
      )
      return mapProductRow(rows[0])
    },
    async deleteProduct(id) {
      // Products can be referenced by historical order items. Removing them
      // physically would violate that relationship, so deletion from the catalog
      // is implemented as a safe archival operation.
      const result = await pool.query(
        `UPDATE products
         SET status = 'archived', stock = 0
         WHERE id = $1 AND status <> 'archived'`,
        [id]
      )
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
      source = 'web',
    }) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const snapshots = []
        for (const item of items) {
          const { rows } = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.productId])
          const product = rows[0]
          if (!product) throw new Error(`Producto inexistente: ${item.productId}`)
          if (Number(product.stock) < item.quantity) throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`)
          snapshots.push(mapOrderItemRow({ ...product, productId: product.id, quantity: item.quantity }))
        }
        const currencies = [...new Set(snapshots.map((item) => item.currency))]
        if (currencies.length > 1) throw new Error('No se pueden combinar monedas diferentes en un pedido')
        const subtotal = snapshots.reduce((sum, item) => sum + item.subtotal, 0)
        const orderResult = await client.query(
          `INSERT INTO orders
            (buyer_name, buyer_phone, buyer_email, delivery_method, delivery_address, delivery_city,
             buyer_notes, payment_method, payment_status, payment_provider, status, tracking_token,
             subtotal, delivery_cost, total, currency, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
            subtotal,
            null,
            subtotal,
            currencies[0] || 'UYU',
            source,
          ]
        )
        const order = orderResult.rows[0]
        for (const item of snapshots) {
          await client.query(
            `INSERT INTO order_items
              (order_id, product_id, quantity, product_name, company, sku, unit, unit_price, currency, lead_time_days)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [order.id, item.productId, item.quantity, item.name, item.company, item.sku || null, item.unit, item.price, item.currency, item.leadTimeDays]
          )
          await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.productId])
        }
        await client.query('COMMIT')
        return {
          id: Number(order.id),
          items: snapshots,
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
          subtotal: Number(order.subtotal),
          deliveryCost: order.delivery_cost == null ? null : Number(order.delivery_cost),
          total: Number(order.total),
          currency: order.currency || currencies[0] || 'UYU',
          source: order.source || source,
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
        const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC', [row.id])
        const latestNotificationResult = await pool.query(
          'SELECT * FROM notification_logs WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
          [row.id]
        )

        results.push({
          id: Number(row.id),
          items: itemsResult.rows.map(mapOrderItemRow),
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
          subtotal: Number(row.subtotal || 0),
          deliveryCost: row.delivery_cost == null ? null : Number(row.delivery_cost),
          total: Number(row.total || row.subtotal || 0),
          currency: row.currency || 'UYU',
          source: row.source || 'web',
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
        `SELECT oi.*
         FROM order_items oi
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
        items: itemsResult.rows.map(mapOrderItemRow),
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
        subtotal: Number(row.subtotal || 0),
        deliveryCost: row.delivery_cost == null ? null : Number(row.delivery_cost),
        total: Number(row.total || row.subtotal || 0),
        currency: row.currency || 'UYU',
        source: row.source || 'web',
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
