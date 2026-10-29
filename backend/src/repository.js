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
    tier: row.tier || 'classic',
    internalNotes: row.internal_notes ?? row.internalNotes ?? '',
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    orderCount: Number(row.order_count ?? row.orderCount ?? 0),
    lastOrderAt: row.last_order_at ?? row.lastOrderAt ?? null,
    invitationStatus: row.invitation_status ?? row.invitationStatus ?? '',
    invitationExpiresAt: row.invitation_expires_at ?? row.invitationExpiresAt ?? null,
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
    b2bProjectId: row.b2b_project_id ? Number(row.b2b_project_id) : null,
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
    milestones: Array.isArray(row.milestones) ? row.milestones : [],
    depositMode: row.deposit_mode ?? row.depositMode ?? 'none',
    depositValue: Number(row.deposit_value ?? row.depositValue ?? 0),
    depositAmount: Number(row.deposit_amount ?? row.depositAmount ?? 0),
    depositStatus: row.deposit_status ?? row.depositStatus ?? 'not_required',
    depositMethod: row.deposit_method ?? row.depositMethod ?? '',
    depositPreferenceId: row.deposit_preference_id ?? row.depositPreferenceId ?? '',
    depositExternalId: row.deposit_external_id ?? row.depositExternalId ?? '',
    depositReceipt: row.deposit_receipt ?? row.depositReceipt ?? null,
    depositReportedAt: row.deposit_reported_at ?? row.depositReportedAt ?? null,
    depositPaidAt: row.deposit_paid_at ?? row.depositPaidAt ?? null,
    documentItems: Array.isArray(row.document_items ?? row.documentItems) ? (row.document_items ?? row.documentItems) : [],
    documentTerms: row.document_terms ?? row.documentTerms ?? {},
    taxRate: Number(row.tax_rate ?? row.taxRate ?? 22),
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

function mapFabricationOrderRow(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    quoteId: row.quote_id ? Number(row.quote_id) : (row.quoteId ? Number(row.quoteId) : null),
    b2bProjectId: row.b2b_project_id ? Number(row.b2b_project_id) : (row.b2bProjectId ? Number(row.b2bProjectId) : null),
    supplierId: Number(row.supplier_id ?? row.supplierId),
    supplierCompany: row.supplier_company ?? row.supplierCompany ?? '',
    projectName: row.project_name ?? row.projectName ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    specifications: typeof row.specifications === 'string' ? JSON.parse(row.specifications) : (row.specifications || {}),
    targetPrice: Number(row.target_price ?? row.targetPrice ?? 0),
    currency: String(row.currency || 'USD').toUpperCase() === 'UYU' ? 'UYU' : 'USD',
    deadline: row.deadline ? (typeof row.deadline === 'string' ? row.deadline.slice(0, 10) : new Date(row.deadline).toISOString().slice(0, 10)) : null,
    status: row.status || 'pending',
    progressPercent: Number(row.progress_percent ?? row.progressPercent ?? 0),
    workshopNotes: row.workshop_notes ?? row.workshopNotes ?? '',
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
    async createCustomerInvitation(payload) {
      const db = readDb(); if (!Array.isArray(db.customerInvitations)) db.customerInvitations=[]
      db.customerInvitations.forEach((item)=>{if(Number(item.userId)===Number(payload.userId)&&item.status==='sent')item.status='revoked'})
      const created={...payload,id:nextId(db.customerInvitations),status:'sent',createdAt:new Date().toISOString()}; db.customerInvitations.push(created); writeDb(db); return created
    },
    async findCustomerInvitation(tokenHash) {
      const db=readDb(); const invite=(db.customerInvitations||[]).find((item)=>item.tokenHash===tokenHash)
      if(!invite)return null; return {...invite,user:db.users.find((u)=>Number(u.id)===Number(invite.userId))||null}
    },
    async acceptCustomerInvitation(id) {
      const db=readDb(); const invite=(db.customerInvitations||[]).find((item)=>Number(item.id)===Number(id)); if(!invite)return false
      invite.status='accepted'; invite.acceptedAt=new Date().toISOString(); const profile=(db.customerProfiles||[]).find((p)=>Number(p.userId)===Number(invite.userId)); if(profile)profile.status='active'; writeDb(db); return true
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
      if (payload.email) user.email = payload.email
      if (payload.name) user.company = payload.name
      if (!Array.isArray(db.customerProfiles)) db.customerProfiles = []
      const index = db.customerProfiles.findIndex((item) => Number(item.userId) === Number(id))
      const prev = index >= 0 ? db.customerProfiles[index] : {}
      const profile = {
        ...prev,
        userId: Number(id),
        phone: payload.phone ?? prev.phone ?? '',
        companyName: payload.companyName ?? prev.companyName ?? '',
        address: payload.address ?? prev.address ?? '',
        city: payload.city ?? prev.city ?? '',
        department: payload.department ?? prev.department ?? '',
        status: payload.status ?? prev.status ?? 'active',
        tier: payload.tier || prev.tier || 'classic',
        internalNotes: payload.internalNotes ?? prev.internalNotes ?? '',
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
    async deleteAdminCustomer(id) {
      const db = readDb()
      const userIndex = db.users.findIndex((item) => Number(item.id) === Number(id) && item.role === 'customer')
      if (userIndex === -1) return false
      db.users.splice(userIndex, 1)
      db.customerProfiles = (db.customerProfiles || []).filter(p => Number(p.userId) !== Number(id))
      db.authSessions = (db.authSessions || []).filter((session) => Number(session.userId) !== Number(id))
      db.customerInvitations = (db.customerInvitations || []).filter(inv => Number(inv.userId || inv.user_id) !== Number(id))
      db.customerQuotes = (db.customerQuotes || []).filter(q => Number(q.customerId || q.customer_user_id) !== Number(id))
      writeDb(db)
      return true
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
        status: 'inactive', tier: payload.tier || 'classic', internalNotes: payload.internalNotes, updatedAt: new Date().toISOString(),
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
    async getAllCustomerQuotes() {
      const db=readDb(); return (db.customerQuotes||[]).map((quote)=>{const user=db.users.find((item)=>Number(item.id)===Number(quote.customerId));return {...mapCustomerQuoteRow(quote),customerName:user?.company||'',customerEmail:user?.email||''}}).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))
    },
    async getCustomerQuoteById(id) {
      const quote=(readDb().customerQuotes||[]).find((item)=>Number(item.id)===Number(id)); return quote?mapCustomerQuoteRow(quote):null
    },
    async createB2bProject(payload) {
      const db = readDb()
      if (!Array.isArray(db.b2bProjects)) db.b2bProjects = []
      const project = {
        id: nextId(db.b2bProjects),
        customerUserId: Number(payload.customerUserId),
        name: payload.name,
        location: payload.location || '',
        status: 'active',
        createdAt: new Date().toISOString()
      }
      db.b2bProjects.push(project)
      writeDb(db)
      return project
    },
    async getB2bProjects(customerUserId) {
      const db = readDb()
      return (db.b2bProjects || []).filter(p => Number(p.customerUserId) === Number(customerUserId))
    },
    async assignQuoteToB2bProject(quoteId, projectId, customerUserId) {
      const db = readDb()
      const quote = (db.customerQuotes || []).find(q => Number(q.id) === Number(quoteId) && Number(q.customerUserId || q.customerId) === Number(customerUserId))
      if (!quote) return null
      quote.b2bProjectId = Number(projectId)
      writeDb(db)
      return mapCustomerQuoteRow(quote)
    },
    async getOxiProProjectData(projectId) {
      const db = readDb()
      const pid = Number(projectId)
      const tasks = (db.oxiProTasks || [])
        .filter(t => Number(t.b2bProjectId) === pid)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      const rubros = (db.oxiProRubros || [])
        .filter(r => Number(r.b2bProjectId) === pid)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      const delays = (db.oxiProDelays || [])
        .filter(d => Number(d.b2bProjectId) === pid)
        .sort((a, b) => new Date(b.date || b.eventDate || 0) - new Date(a.date || a.eventDate || 0))
      return { tasks, rubros, delays }
    },
    async saveOxiProTasks(projectId, tasks) {
      const db = readDb()
      const pid = Number(projectId)
      if (!Array.isArray(db.oxiProTasks)) db.oxiProTasks = []
      db.oxiProTasks = db.oxiProTasks.filter(t => Number(t.b2bProjectId) !== pid)
      let nextTaskId = 1
      if (db.oxiProTasks.length > 0) {
        nextTaskId = Math.max(...db.oxiProTasks.map(t => Number(t.id) || 0)) + 1
      }
      const saved = (tasks || []).map((t, idx) => ({
        id: nextTaskId++,
        b2bProjectId: pid,
        name: t.name || 'Tarea',
        startDate: t.startDate || '',
        endDate: t.endDate || '',
        peopleCount: Number(t.peopleCount) || 1,
        category: t.category || 'Oficial',
        categoryRate: Number(t.categoryRate) || 2800,
        assignedLaborCost: Number(t.assignedLaborCost) || 0,
        socialLawsCost: Number(t.socialLawsCost) || 0,
        materialCost: Number(t.materialCost) || 0,
        month: t.month || 'Mes 1',
        plannedPercent: Number(t.plannedPercent) || 0,
        progressPercent: Number(t.progressPercent) || 0,
        orderIndex: idx,
        certifications: Array.isArray(t.certifications) ? t.certifications : [],
        crewLines: Array.isArray(t.crewLines) ? t.crewLines : [],
        customSocialLaws: t.customSocialLaws || null,
        materialBudgetAssignment: t.materialBudgetAssignment || null
      }))
      db.oxiProTasks.push(...saved)
      writeDb(db)
      return saved
    },
    async saveOxiProRubros(projectId, rubros) {
      const db = readDb()
      const pid = Number(projectId)
      if (!Array.isArray(db.oxiProRubros)) db.oxiProRubros = []
      db.oxiProRubros = db.oxiProRubros.filter(r => Number(r.b2bProjectId) !== pid)
      let nextRubroId = 1
      if (db.oxiProRubros.length > 0) {
        nextRubroId = Math.max(...db.oxiProRubros.map(r => Number(r.dbId || r.id) || 0)) + 1
      }
      const saved = (rubros || []).map((r, idx) => ({
        id: r.id || r.rubroKey || `rubro_${idx}`,
        dbId: nextRubroId++,
        b2bProjectId: pid,
        rubroKey: r.rubroKey || r.id || `rubro_${idx}`,
        name: r.name || 'Rubro',
        laborCost: Number(r.laborCost) || 0,
        socialLawsCost: Number(r.socialLawsCost) || 0,
        materialCost: Number(r.materialCost) || 0,
        budgeted: Number(r.budgeted) || 0,
        executed: Number(r.executed) || 0,
        orderIndex: idx
      }))
      db.oxiProRubros.push(...saved)
      writeDb(db)
      return saved
    },
    async createOxiProDelay(projectId, delay) {
      const db = readDb()
      const pid = Number(projectId)
      if (!Array.isArray(db.oxiProDelays)) db.oxiProDelays = []
      const nextDelayId = db.oxiProDelays.length > 0 ? Math.max(...db.oxiProDelays.map(d => Number(d.id) || 0)) + 1 : 1
      const created = {
        id: nextDelayId,
        b2bProjectId: pid,
        date: delay.eventDate || delay.date || new Date().toISOString().split('T')[0],
        eventDate: delay.eventDate || delay.date || new Date().toISOString().split('T')[0],
        days: Number(delay.days) || 1,
        cause: delay.cause || 'Lluvia intensa y precipitaciones',
        notes: delay.notes || '',
        tasksSnapshot: delay.tasksSnapshot || [],
        createdAt: new Date().toISOString()
      }
      db.oxiProDelays.push(created)
      writeDb(db)
      return created
    },
    async deleteOxiProDelay(delayId, projectId) {
      const db = readDb()
      const pid = Number(projectId)
      const did = Number(delayId)
      if (!Array.isArray(db.oxiProDelays)) db.oxiProDelays = []
      const existing = db.oxiProDelays.find(d => Number(d.id) === did && Number(d.b2bProjectId) === pid)
      if (!existing) return null
      db.oxiProDelays = db.oxiProDelays.filter(d => !(Number(d.id) === did && Number(d.b2bProjectId) === pid))
      writeDb(db)
      return existing
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
    async updateCustomerQuoteDeposit(id, updates) {
      const db=readDb();const quote=(db.customerQuotes||[]).find(item=>Number(item.id)===Number(id));if(!quote)return null;Object.assign(quote,updates,{updatedAt:new Date().toISOString()});writeDb(db);return mapCustomerQuoteRow(quote)
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
    async getDueQuoteReminders() {
      const db=readDb(); const reminders=Array.isArray(db.customerQuoteReminders)?db.customerQuoteReminders:[]; const now=Date.now(); const due=[]
      for(const quote of db.customerQuotes||[]){if(quote.status!=='sent'||!quote.sentAt)continue;const age=now-new Date(quote.sentAt).getTime();const user=db.users.find(item=>Number(item.id)===Number(quote.customerId));for(const [type,days] of [['client_day_7',7],['admin_day_14',14]]){const previous=reminders.find(item=>Number(item.quoteId)===Number(quote.id)&&item.reminderType===type);const retryAllowed=!previous||previous.status!=='sent'&&(now-new Date(previous.attemptedAt||0).getTime()>=24*60*60*1000);if(age>=days*24*60*60*1000&&retryAllowed)due.push({...mapCustomerQuoteRow(quote),reminderType:type,customerEmail:user?.email||'',customerName:user?.company||''})}}
      return due
    },
    async recordQuoteReminder({quoteId,reminderType,status,errorMessage=''}) {
      const db=readDb();if(!Array.isArray(db.customerQuoteReminders))db.customerQuoteReminders=[];let row=db.customerQuoteReminders.find(item=>Number(item.quoteId)===Number(quoteId)&&item.reminderType===reminderType);const values={quoteId:Number(quoteId),reminderType,status,attemptedAt:new Date().toISOString(),sentAt:status==='sent'?new Date().toISOString():null,errorMessage};if(row)Object.assign(row,values);else{row={id:nextId(db.customerQuoteReminders),...values};db.customerQuoteReminders.push(row)}writeDb(db);return row
    },
    async getProviders() {
      return readDb().providers
    },
    async getFabricationSuppliers() {
      const db = readDb()
      return (db.users || [])
        .filter((u) => u.role === 'provider')
        .map((u) => ({
          id: Number(u.id),
          email: u.email,
          company: u.company || u.email,
          providerId: u.providerId ? Number(u.providerId) : null,
        }))
    },
    async createFabricationOrder(payload) {
      const db = readDb()
      if (!Array.isArray(db.fabricationOrders)) db.fabricationOrders = []
      const order = {
        id: nextId(db.fabricationOrders),
        quoteId: payload.quoteId ? Number(payload.quoteId) : null,
        b2bProjectId: payload.b2bProjectId ? Number(payload.b2bProjectId) : null,
        supplierId: Number(payload.supplierId),
        supplierCompany: payload.supplierCompany || '',
        projectName: payload.projectName || '',
        title: payload.title,
        description: payload.description || '',
        specifications: payload.specifications || {},
        targetPrice: Number(payload.targetPrice || 0),
        currency: String(payload.currency || 'USD').toUpperCase() === 'UYU' ? 'UYU' : 'USD',
        deadline: payload.deadline || null,
        status: payload.status || 'pending',
        progressPercent: Number(payload.progressPercent || 0),
        workshopNotes: payload.workshopNotes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      db.fabricationOrders.push(order)
      writeDb(db)
      return mapFabricationOrderRow(order)
    },
    async getFabricationOrders(filters = {}) {
      const db = readDb()
      let list = db.fabricationOrders || []
      if (filters.supplierId) {
        list = list.filter((o) => Number(o.supplierId) === Number(filters.supplierId))
      }
      if (filters.quoteId) {
        list = list.filter((o) => Number(o.quoteId) === Number(filters.quoteId))
      }
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(mapFabricationOrderRow)
    },
    async getFabricationOrderById(id) {
      const db = readDb()
      const found = (db.fabricationOrders || []).find((o) => Number(o.id) === Number(id))
      return found ? mapFabricationOrderRow(found) : null
    },
    async updateFabricationOrder(id, updates) {
      const db = readDb()
      if (!Array.isArray(db.fabricationOrders)) db.fabricationOrders = []
      const index = db.fabricationOrders.findIndex((o) => Number(o.id) === Number(id))
      if (index === -1) return null
      const existing = db.fabricationOrders[index]
      const updated = {
        ...existing,
        ...updates,
        progressPercent: updates.progressPercent !== undefined ? Math.min(100, Math.max(0, Number(updates.progressPercent))) : existing.progressPercent,
        updatedAt: new Date().toISOString(),
      }
      db.fabricationOrders[index] = updated
      writeDb(db)
      return mapFabricationOrderRow(updated)
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
    async getModelerProject(ownerUserId) {
      const db = readDb()
      return (db.modelerProjects || []).filter((item) => Number(item.ownerUserId) === Number(ownerUserId)).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))[0] || null
    },
    async listModelerProjects(ownerUserId) {
      const db = readDb()
      return (db.modelerProjects || []).filter((item) => Number(item.ownerUserId) === Number(ownerUserId)).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))
    },
    async getModelerProjectById(ownerUserId, projectId) {
      const db = readDb()
      return (db.modelerProjects || []).find((item) => Number(item.ownerUserId) === Number(ownerUserId) && Number(item.id) === Number(projectId)) || null
    },
    async createModelerProject(ownerUserId, payload) {
      const db = readDb(); if (!Array.isArray(db.modelerProjects)) db.modelerProjects = []; const now = new Date().toISOString()
      const project = { id: nextId(db.modelerProjects), ownerUserId: Number(ownerUserId), name: payload.name, model: payload.model, version: 1, createdAt: now, updatedAt: now }
      db.modelerProjects.push(project); writeDb(db); return project
    },
    async saveModelerProject(ownerUserId, payload, projectId = null) {
      const db = readDb()
      if (!Array.isArray(db.modelerProjects)) db.modelerProjects = []
      const now = new Date().toISOString()
      let project = projectId == null ? db.modelerProjects.filter((item) => Number(item.ownerUserId) === Number(ownerUserId)).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))[0] : db.modelerProjects.find((item) => Number(item.ownerUserId) === Number(ownerUserId) && Number(item.id) === Number(projectId))
      if (project) {
        if (payload.expectedVersion == null || Number(payload.expectedVersion) !== Number(project.version)) return null
        project.name = payload.name
        project.model = payload.model
        project.version = Number(project.version || 0) + 1
        project.updatedAt = now
      } else {
        project = { id: nextId(db.modelerProjects), ownerUserId: Number(ownerUserId), name: payload.name, model: payload.model, version: 1, createdAt: now, updatedAt: now }
        db.modelerProjects.push(project)
      }
      writeDb(db)
      return project
    },
  }
}

let fabricationTableChecked = false
async function ensureFabricationOrdersTable(pool) {
  if (fabricationTableChecked) return
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fabrication_orders (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER REFERENCES customer_quotes(id) ON DELETE SET NULL,
        b2b_project_id INTEGER REFERENCES b2b_projects(id) ON DELETE SET NULL,
        supplier_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        supplier_company TEXT NOT NULL,
        project_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        specifications JSONB DEFAULT '{}'::jsonb,
        target_price NUMERIC(12, 2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        deadline DATE,
        status TEXT NOT NULL DEFAULT 'pending',
        progress_percent INTEGER NOT NULL DEFAULT 0,
        workshop_notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_fabrication_orders_supplier_id ON fabrication_orders(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_fabrication_orders_quote_id ON fabrication_orders(quote_id);
      CREATE INDEX IF NOT EXISTS idx_fabrication_orders_status ON fabrication_orders(status);
    `)
  } catch (err) {
    console.error('[ensureFabricationOrdersTable:warning]', err.message)
  }
  fabricationTableChecked = true
}

let oxiProTablesChecked = false
async function ensureOxiProTables(pool) {
  if (oxiProTablesChecked) return
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS b2b_project_tasks (
        id SERIAL PRIMARY KEY,
        b2b_project_id INTEGER NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        people_count INTEGER DEFAULT 1,
        category TEXT DEFAULT 'Oficial',
        category_rate NUMERIC DEFAULT 2800,
        assigned_labor_cost NUMERIC DEFAULT 0,
        social_laws_cost NUMERIC DEFAULT 0,
        material_cost NUMERIC DEFAULT 0,
        month TEXT DEFAULT 'Mes 1',
        planned_percent NUMERIC DEFAULT 0,
        progress_percent NUMERIC DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        certifications JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE b2b_project_tasks ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE b2b_project_tasks ADD COLUMN IF NOT EXISTS crew_lines JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE b2b_project_tasks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE b2b_projects ADD COLUMN IF NOT EXISTS oxipro_state JSONB DEFAULT '{}'::jsonb;
      CREATE INDEX IF NOT EXISTS idx_b2b_project_tasks_project_id ON b2b_project_tasks(b2b_project_id);

      CREATE TABLE IF NOT EXISTS b2b_project_rubros (
        id SERIAL PRIMARY KEY,
        b2b_project_id INTEGER NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
        rubro_key TEXT NOT NULL,
        name TEXT NOT NULL,
        labor_cost NUMERIC DEFAULT 0,
        social_laws_cost NUMERIC DEFAULT 0,
        material_cost NUMERIC DEFAULT 0,
        budgeted NUMERIC DEFAULT 0,
        executed NUMERIC DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_b2b_project_rubros_project_id ON b2b_project_rubros(b2b_project_id);

      CREATE TABLE IF NOT EXISTS b2b_project_delays (
        id SERIAL PRIMARY KEY,
        b2b_project_id INTEGER NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
        event_date DATE NOT NULL,
        days INTEGER NOT NULL DEFAULT 1,
        cause TEXT NOT NULL DEFAULT 'Lluvia intensa y precipitaciones',
        notes TEXT DEFAULT '',
        tasks_snapshot JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_b2b_project_delays_project_id ON b2b_project_delays(b2b_project_id);
    `)
  } catch (err) {
    console.error('[ensureOxiProTables:warning]', err.message)
  }
  oxiProTablesChecked = true
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
    async createCustomerInvitation(payload) {
      const client=await pool.connect(); try{await client.query('BEGIN'); await client.query("UPDATE customer_invitations SET status='revoked' WHERE user_id=$1 AND status='sent'",[payload.userId]); const {rows}=await client.query(`INSERT INTO customer_invitations (user_id,email,token_hash,expires_at,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,[payload.userId,payload.email,payload.tokenHash,payload.expiresAt,payload.createdBy]); await client.query('COMMIT'); return rows[0]}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
    },
    async findCustomerInvitation(tokenHash) {
      const {rows}=await pool.query(`SELECT customer_invitations.*,users.company,users.email AS user_email FROM customer_invitations JOIN users ON users.id=customer_invitations.user_id WHERE token_hash=$1 LIMIT 1`,[tokenHash]); if(!rows[0])return null; return {...rows[0],userId:Number(rows[0].user_id),user:{id:Number(rows[0].user_id),company:rows[0].company,email:rows[0].user_email}}
    },
    async acceptCustomerInvitation(id) {
      const client=await pool.connect(); try{await client.query('BEGIN'); const {rows}=await client.query("UPDATE customer_invitations SET status='accepted',accepted_at=NOW() WHERE id=$1 RETURNING user_id",[id]); if(!rows[0]){await client.query('ROLLBACK');return false} await client.query(`INSERT INTO customer_profiles (user_id,status) VALUES ($1,'active') ON CONFLICT(user_id) DO UPDATE SET status='active',updated_at=NOW()`,[rows[0].user_id]); await client.query('COMMIT'); return true}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
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
                COALESCE(customer_profiles.tier, 'classic') AS tier,
                customer_profiles.internal_notes, customer_profiles.updated_at,
                COALESCE(order_summary.order_count, 0)::int AS order_count,
                order_summary.last_order_at, latest_invitation.status AS invitation_status,
                latest_invitation.expires_at AS invitation_expires_at
         FROM users
         LEFT JOIN customer_profiles ON customer_profiles.user_id = users.id
         LEFT JOIN (
           SELECT LOWER(buyer_email) AS email_key, COUNT(*) AS order_count, MAX(created_at) AS last_order_at
           FROM orders
           WHERE buyer_email IS NOT NULL AND buyer_email <> ''
           GROUP BY LOWER(buyer_email)
         ) AS order_summary ON order_summary.email_key = LOWER(users.email)
         LEFT JOIN LATERAL (
           SELECT status, expires_at FROM customer_invitations
           WHERE user_id = users.id ORDER BY created_at DESC LIMIT 1
         ) AS latest_invitation ON TRUE
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
          `UPDATE users SET
             email = COALESCE($1, email),
             company = COALESCE($2, company)
           WHERE id = $3 AND role = 'customer'
           RETURNING id, email, company AS name, created_at`,
          [payload.email || null, payload.name || null, id]
        )
        if (!users[0]) {
          await client.query('ROLLBACK')
          return null
        }
        const validStatus = ['active', 'inactive', 'blocked'].includes(payload.status) ? payload.status : 'active'
        const { rows: profiles } = await client.query(
          `INSERT INTO customer_profiles
             (user_id, phone, company_name, address, city, department, status, tier, internal_notes, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             phone=COALESCE(NULLIF(EXCLUDED.phone, ''), customer_profiles.phone, ''),
             company_name=COALESCE(NULLIF(EXCLUDED.company_name, ''), customer_profiles.company_name, ''),
             address=COALESCE(NULLIF(EXCLUDED.address, ''), customer_profiles.address, ''),
             city=COALESCE(NULLIF(EXCLUDED.city, ''), customer_profiles.city, ''),
             department=COALESCE(NULLIF(EXCLUDED.department, ''), customer_profiles.department, ''),
             status=COALESCE(NULLIF(EXCLUDED.status, ''), customer_profiles.status, 'active'),
             tier=COALESCE(EXCLUDED.tier, customer_profiles.tier, 'classic'),
             internal_notes=COALESCE(NULLIF(EXCLUDED.internal_notes, ''), customer_profiles.internal_notes, ''),
             updated_at=NOW()
           RETURNING *`,
          [
            id,
            payload.phone ?? '',
            payload.companyName ?? '',
            payload.address ?? '',
            payload.city ?? '',
            payload.department ?? '',
            validStatus,
            payload.tier || 'classic',
            payload.internalNotes ?? ''
          ]
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
    async deleteAdminCustomer(id) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [id])
        await client.query('DELETE FROM customer_invitations WHERE user_id = $1', [id])
        await client.query('DELETE FROM quote_reminders WHERE quote_id IN (SELECT id FROM customer_quotes WHERE customer_user_id = $1)', [id])
        await client.query('DELETE FROM customer_quote_messages WHERE quote_id IN (SELECT id FROM customer_quotes WHERE customer_user_id = $1) OR author_user_id = $1', [id])
        await client.query('DELETE FROM customer_quotes WHERE customer_user_id = $1', [id])
        await client.query('DELETE FROM b2b_projects WHERE customer_user_id = $1', [id])
        await client.query('DELETE FROM modeler_projects WHERE owner_user_id = $1', [id])
        await client.query('DELETE FROM customer_profiles WHERE user_id = $1', [id])
        const result = await client.query("DELETE FROM users WHERE id = $1 AND role = 'customer'", [id])
        await client.query('COMMIT')
        return (result.rowCount ?? 0) > 0
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
             (user_id, phone, company_name, address, city, department, status, tier, internal_notes)
           VALUES ($1,$2,$3,$4,$5,$6,'inactive',$7,$8)
           RETURNING *`,
          [users[0].id, payload.phone, payload.companyName, payload.address, payload.city, payload.department, payload.tier || 'classic', payload.internalNotes]
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
                COALESCE(customer_profiles.tier, 'classic') AS tier,
                customer_profiles.internal_notes, customer_profiles.updated_at,
                COALESCE(order_summary.order_count, 0)::int AS order_count,
                order_summary.last_order_at, latest_invitation.status AS invitation_status,
                latest_invitation.expires_at AS invitation_expires_at
         FROM users
         LEFT JOIN customer_profiles ON customer_profiles.user_id = users.id
         LEFT JOIN (
           SELECT LOWER(buyer_email) AS email_key, COUNT(*) AS order_count, MAX(created_at) AS last_order_at
           FROM orders WHERE buyer_email IS NOT NULL AND buyer_email <> '' GROUP BY LOWER(buyer_email)
         ) AS order_summary ON order_summary.email_key = LOWER(users.email)
         LEFT JOIN LATERAL (
           SELECT status, expires_at FROM customer_invitations
           WHERE user_id = users.id ORDER BY created_at DESC LIMIT 1
         ) AS latest_invitation ON TRUE
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
    async getAllCustomerQuotes() {
      const {rows}=await pool.query(`SELECT customer_quotes.*,users.company AS customer_name,users.email AS customer_email FROM customer_quotes JOIN users ON users.id=customer_quotes.customer_user_id ORDER BY customer_quotes.updated_at DESC,customer_quotes.id DESC`)
      return rows.map((row)=>({...mapCustomerQuoteRow(row),customerName:row.customer_name||'',customerEmail:row.customer_email||''}))
    },
    async getCustomerQuoteById(id) {
      const {rows}=await pool.query('SELECT * FROM customer_quotes WHERE id=$1 LIMIT 1',[id]); return rows[0]?mapCustomerQuoteRow(rows[0]):null
    },
    async createB2bProject(payload) {
      const { rows } = await pool.query(
        `INSERT INTO b2b_projects (customer_user_id, name, location) VALUES ($1, $2, $3) RETURNING *`,
        [payload.customerUserId, payload.name, payload.location || '']
      )
      return { id: Number(rows[0].id), customerUserId: Number(rows[0].customer_user_id), name: rows[0].name, location: rows[0].location, status: rows[0].status, createdAt: rows[0].created_at }
    },
    async getB2bProjects(customerUserId) {
      const { rows } = await pool.query(
        `SELECT * FROM b2b_projects WHERE customer_user_id = $1 ORDER BY created_at DESC`,
        [customerUserId]
      )
      return rows.map(r => ({ id: Number(r.id), customerUserId: Number(r.customer_user_id), name: r.name, location: r.location, status: r.status, createdAt: r.created_at }))
    },
    async assignQuoteToB2bProject(quoteId, projectId, customerUserId) {
      const { rows } = await pool.query(
        `UPDATE customer_quotes SET b2b_project_id = $1 WHERE id = $2 AND customer_user_id = $3 RETURNING *`,
        [projectId, quoteId, customerUserId]
      )
      return rows[0] ? mapCustomerQuoteRow(rows[0]) : null
    },
    async getOxiProProjectData(projectId) {
      await ensureOxiProTables(pool)
      const tasksRes = await pool.query(
        `SELECT * FROM b2b_project_tasks WHERE b2b_project_id = $1 ORDER BY order_index ASC, id ASC`,
        [projectId]
      )
      const rubrosRes = await pool.query(
        `SELECT * FROM b2b_project_rubros WHERE b2b_project_id = $1 ORDER BY order_index ASC, id ASC`,
        [projectId]
      )
      const delaysRes = await pool.query(
        `SELECT * FROM b2b_project_delays WHERE b2b_project_id = $1 ORDER BY event_date DESC, id DESC`,
        [projectId]
      )

      return {
        tasks: tasksRes.rows.map(r => ({
          id: r.id,
          b2bProjectId: r.b2b_project_id,
          name: r.name,
          startDate: r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : '',
          endDate: r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : '',
          peopleCount: Number(r.people_count) || 1,
          category: r.category,
          categoryRate: Number(r.category_rate) || 0,
          assignedLaborCost: Number(r.assigned_labor_cost) || 0,
          socialLawsCost: Number(r.social_laws_cost) || 0,
          materialCost: Number(r.material_cost) || 0,
          month: r.month,
          plannedPercent: Number(r.planned_percent) || 0,
          progressPercent: Number(r.progress_percent) || 0,
          orderIndex: r.order_index,
          certifications: r.certifications || [],
          crewLines: r.crew_lines || [],
          customSocialLaws: r.metadata?.customSocialLaws || null,
          materialBudgetAssignment: r.metadata?.materialBudgetAssignment || null
        })),
        rubros: rubrosRes.rows.map(r => ({
          id: r.rubro_key || String(r.id),
          dbId: r.id,
          b2bProjectId: r.b2b_project_id,
          rubroKey: r.rubro_key,
          name: r.name,
          laborCost: Number(r.labor_cost) || 0,
          socialLawsCost: Number(r.social_laws_cost) || 0,
          materialCost: Number(r.material_cost) || 0,
          budgeted: Number(r.budgeted) || 0,
          executed: Number(r.executed) || 0,
          orderIndex: r.order_index
        })),
        delays: delaysRes.rows.map(r => ({
          id: r.id,
          b2bProjectId: r.b2b_project_id,
          date: r.event_date ? new Date(r.event_date).toISOString().split('T')[0] : '',
          eventDate: r.event_date ? new Date(r.event_date).toISOString().split('T')[0] : '',
          days: Number(r.days) || 1,
          cause: r.cause,
          notes: r.notes || '',
          tasksSnapshot: r.tasks_snapshot || [],
          createdAt: r.created_at
        }))
      }
    },
    async saveOxiProTasks(projectId, tasks) {
      await ensureOxiProTables(pool)
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query('DELETE FROM b2b_project_tasks WHERE b2b_project_id = $1', [projectId])
        const inserted = []
        for (let i = 0; i < (tasks || []).length; i++) {
          const t = tasks[i]
          const { rows } = await client.query(
            `INSERT INTO b2b_project_tasks (
              b2b_project_id, name, start_date, end_date, people_count, category, category_rate,
              assigned_labor_cost, social_laws_cost, material_cost, month, planned_percent, progress_percent, order_index, certifications, crew_lines, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
            [
              projectId,
              t.name || 'Tarea',
              t.startDate || null,
              t.endDate || null,
              Number(t.peopleCount) || 1,
              t.category || 'Oficial',
              Number(t.categoryRate) || 2800,
              Number(t.assignedLaborCost) || 0,
              Number(t.socialLawsCost) || 0,
              Number(t.materialCost) || 0,
              t.month || 'Mes 1',
              Number(t.plannedPercent) || 0,
              Number(t.progressPercent) || 0,
              i,
              JSON.stringify(t.certifications || []),
              JSON.stringify(t.crewLines || []),
              JSON.stringify({
                customSocialLaws: t.customSocialLaws || null,
                materialBudgetAssignment: t.materialBudgetAssignment || null
              })
            ]
          )
          const r = rows[0]
          inserted.push({
            id: r.id,
            b2bProjectId: r.b2b_project_id,
            name: r.name,
            startDate: r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : '',
            endDate: r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : '',
            peopleCount: Number(r.people_count) || 1,
            category: r.category,
            categoryRate: Number(r.category_rate) || 0,
            assignedLaborCost: Number(r.assigned_labor_cost) || 0,
            socialLawsCost: Number(r.social_laws_cost) || 0,
            materialCost: Number(r.material_cost) || 0,
            month: r.month,
            plannedPercent: Number(r.planned_percent) || 0,
            progressPercent: Number(r.progress_percent) || 0,
            orderIndex: r.order_index,
            certifications: r.certifications || [],
            crewLines: r.crew_lines || [],
            customSocialLaws: r.metadata?.customSocialLaws || null,
            materialBudgetAssignment: r.metadata?.materialBudgetAssignment || null
          })
        }
        await client.query('COMMIT')
        return inserted
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },
    async saveOxiProRubros(projectId, rubros) {
      await ensureOxiProTables(pool)
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query('DELETE FROM b2b_project_rubros WHERE b2b_project_id = $1', [projectId])
        const inserted = []
        for (let i = 0; i < (rubros || []).length; i++) {
          const r = rubros[i]
          const { rows } = await client.query(
            `INSERT INTO b2b_project_rubros (
              b2b_project_id, rubro_key, name, labor_cost, social_laws_cost, material_cost, budgeted, executed, order_index
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
              projectId,
              r.id || r.rubroKey || `rubro_${i}`,
              r.name || 'Rubro',
              Number(r.laborCost) || 0,
              Number(r.socialLawsCost) || 0,
              Number(r.materialCost) || 0,
              Number(r.budgeted) || 0,
              Number(r.executed) || 0,
              i
            ]
          )
          const row = rows[0]
          inserted.push({
            id: row.rubro_key || String(row.id),
            dbId: row.id,
            b2bProjectId: row.b2b_project_id,
            rubroKey: row.rubro_key,
            name: row.name,
            laborCost: Number(row.labor_cost) || 0,
            socialLawsCost: Number(row.social_laws_cost) || 0,
            materialCost: Number(row.material_cost) || 0,
            budgeted: Number(row.budgeted) || 0,
            executed: Number(row.executed) || 0,
            orderIndex: row.order_index
          })
        }
        await client.query('COMMIT')
        return inserted
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },
    async createOxiProDelay(projectId, delay) {
      await ensureOxiProTables(pool)
      const { rows } = await pool.query(
        `INSERT INTO b2b_project_delays (
          b2b_project_id, event_date, days, cause, notes, tasks_snapshot
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          projectId,
          delay.eventDate || new Date().toISOString().split('T')[0],
          Number(delay.days) || 1,
          delay.cause || 'Lluvia intensa y precipitaciones',
          delay.notes || '',
          JSON.stringify(delay.tasksSnapshot || [])
        ]
      )
      const r = rows[0]
      return {
        id: r.id,
        b2bProjectId: r.b2b_project_id,
        date: r.event_date ? new Date(r.event_date).toISOString().split('T')[0] : '',
        eventDate: r.event_date ? new Date(r.event_date).toISOString().split('T')[0] : '',
        days: Number(r.days) || 1,
        cause: r.cause,
        notes: r.notes || '',
        tasksSnapshot: r.tasks_snapshot || [],
        createdAt: r.created_at
      }
    },
    async deleteOxiProDelay(delayId, projectId) {
      await ensureOxiProTables(pool)
      const { rows } = await pool.query(
        `DELETE FROM b2b_project_delays WHERE id = $1 AND b2b_project_id = $2 RETURNING *`,
        [delayId, projectId]
      )
      if (!rows[0]) return null
      const r = rows[0]
      return {
        id: r.id,
        b2bProjectId: r.b2b_project_id,
        date: r.event_date ? new Date(r.event_date).toISOString().split('T')[0] : '',
        days: Number(r.days) || 1
      }
    },
    async createCustomerQuote(payload) {
      const { rows } = await pool.query(
        `INSERT INTO customer_quotes
           (customer_user_id, reference_number, title, description, status, total_amount, currency,
            sent_at, estimated_start_at, estimated_end_at, internal_notes, created_by, attachments, desired_date, budget, b2b_project_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          payload.customerId, payload.referenceNumber, payload.title, payload.description,
          payload.status, payload.totalAmount, payload.currency,
          payload.status === 'sent' ? new Date() : null,
          payload.estimatedStartAt || null, payload.estimatedEndAt || null,
          payload.internalNotes, payload.createdBy, JSON.stringify(payload.attachments || []),
          payload.desiredDate || null, payload.budget ?? null, payload.b2bProjectId ?? null,
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
         proposal_description=$11, milestones=$12, deposit_mode=$13, deposit_value=$14, deposit_amount=$15,
         document_items=$16, document_terms=$17, tax_rate=$18,
         sent_at=CASE WHEN $3='sent' AND sent_at IS NULL THEN NOW() ELSE sent_at END, updated_at=NOW()
         WHERE id=$19 RETURNING *`,
        [merged.title, merged.description, merged.status, merged.totalAmount, merged.currency,
          merged.estimatedStartAt || null, merged.estimatedEndAt || null, merged.desiredDate || null,
          merged.budget ?? null, JSON.stringify(merged.attachments || []), merged.proposalDescription || '',
          JSON.stringify(merged.milestones || []), merged.depositMode || 'none', merged.depositValue || 0,
          merged.depositAmount || 0, JSON.stringify(merged.documentItems || []), JSON.stringify(merged.documentTerms || {}),
          merged.taxRate ?? 22, id]
      )
      return mapCustomerQuoteRow(rows[0])
    },
    async updateCustomerQuoteDeposit(id, updates) {
      const current=await this.getCustomerQuoteById(id);if(!current)return null;const merged={...current,...updates}
      const {rows}=await pool.query(`UPDATE customer_quotes SET deposit_status=$1,deposit_method=$2,deposit_preference_id=$3,deposit_external_id=$4,deposit_receipt=$5,deposit_reported_at=$6,deposit_paid_at=$7,status=$8,updated_at=NOW() WHERE id=$9 RETURNING *`,[merged.depositStatus,merged.depositMethod||'',merged.depositPreferenceId||'',merged.depositExternalId||'',merged.depositReceipt?JSON.stringify(merged.depositReceipt):null,merged.depositReportedAt||null,merged.depositPaidAt||null,merged.status,id])
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
    async getDueQuoteReminders() {
      const {rows}=await pool.query(`SELECT customer_quotes.*,users.email AS customer_email,users.company AS customer_name,reminder.reminder_type,reminder.status AS reminder_status,reminder.attempted_at FROM customer_quotes JOIN users ON users.id=customer_quotes.customer_user_id CROSS JOIN (VALUES ('client_day_7',7),('admin_day_14',14)) AS schedule(reminder_type,days) LEFT JOIN customer_quote_reminders reminder ON reminder.quote_id=customer_quotes.id AND reminder.reminder_type=schedule.reminder_type WHERE customer_quotes.status='sent' AND customer_quotes.sent_at IS NOT NULL AND customer_quotes.sent_at<=NOW()-(schedule.days*INTERVAL '1 day') AND (reminder.id IS NULL OR (reminder.status<>'sent' AND reminder.attempted_at<=NOW()-INTERVAL '24 hours')) ORDER BY customer_quotes.sent_at ASC`)
      return rows.map(row=>({...mapCustomerQuoteRow(row),reminderType:row.reminder_type,customerEmail:row.customer_email||'',customerName:row.customer_name||''}))
    },
    async recordQuoteReminder({quoteId,reminderType,status,errorMessage=''}) {
      const {rows}=await pool.query(`INSERT INTO customer_quote_reminders (quote_id,reminder_type,status,attempted_at,sent_at,error_message) VALUES ($1,$2,$3,NOW(),CASE WHEN $3='sent' THEN NOW() ELSE NULL END,$4) ON CONFLICT (quote_id,reminder_type) DO UPDATE SET status=EXCLUDED.status,attempted_at=NOW(),sent_at=CASE WHEN EXCLUDED.status='sent' THEN NOW() ELSE customer_quote_reminders.sent_at END,error_message=EXCLUDED.error_message RETURNING *`,[quoteId,reminderType,status,errorMessage])
      return rows[0]
    },
    async getProviders() {
      const { rows } = await pool.query('SELECT * FROM providers ORDER BY name ASC')
      return rows.map(mapProviderRow)
    },
    async getFabricationSuppliers() {
      const { rows } = await pool.query(`
        SELECT id, email, company, provider_id
        FROM users
        WHERE role = 'provider'
        ORDER BY COALESCE(NULLIF(company, ''), email) ASC
      `)
      return rows.map((r) => ({
        id: Number(r.id),
        email: r.email,
        company: r.company || r.email,
        providerId: r.provider_id ? Number(r.provider_id) : null,
      }))
    },
    async createFabricationOrder(payload) {
      await ensureFabricationOrdersTable(pool)
      const { rows } = await pool.query(`
        INSERT INTO fabrication_orders (
          quote_id, b2b_project_id, supplier_id, supplier_company,
          project_name, title, description, specifications,
          target_price, currency, deadline, status, progress_percent, workshop_notes
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8::jsonb,
          $9, $10, $11, $12, $13, $14
        ) RETURNING *
      `, [
        payload.quoteId ? Number(payload.quoteId) : null,
        payload.b2bProjectId ? Number(payload.b2bProjectId) : null,
        Number(payload.supplierId),
        payload.supplierCompany || '',
        payload.projectName || '',
        payload.title,
        payload.description || '',
        JSON.stringify(payload.specifications || {}),
        Number(payload.targetPrice || 0),
        String(payload.currency || 'USD').toUpperCase() === 'UYU' ? 'UYU' : 'USD',
        payload.deadline || null,
        payload.status || 'pending',
        Number(payload.progressPercent || 0),
        payload.workshopNotes || '',
      ])
      return mapFabricationOrderRow(rows[0])
    },
    async getFabricationOrders(filters = {}) {
      await ensureFabricationOrdersTable(pool)
      let query = 'SELECT * FROM fabrication_orders'
      const params = []
      const clauses = []
      if (filters.supplierId) {
        params.push(Number(filters.supplierId))
        clauses.push(`supplier_id = $${params.length}`)
      }
      if (filters.quoteId) {
        params.push(Number(filters.quoteId))
        clauses.push(`quote_id = $${params.length}`)
      }
      if (clauses.length > 0) {
        query += ` WHERE ${clauses.join(' AND ')}`
      }
      query += ' ORDER BY created_at DESC'
      const { rows } = await pool.query(query, params)
      return rows.map(mapFabricationOrderRow)
    },
    async getFabricationOrderById(id) {
      await ensureFabricationOrdersTable(pool)
      const { rows } = await pool.query('SELECT * FROM fabrication_orders WHERE id = $1 LIMIT 1', [id])
      return rows[0] ? mapFabricationOrderRow(rows[0]) : null
    },
    async updateFabricationOrder(id, updates) {
      await ensureFabricationOrdersTable(pool)
      const existing = await this.getFabricationOrderById(id)
      if (!existing) return null

      const updated = {
        ...existing,
        ...updates,
        progressPercent: updates.progressPercent !== undefined ? Math.min(100, Math.max(0, Number(updates.progressPercent))) : existing.progressPercent,
      }

      const { rows } = await pool.query(`
        UPDATE fabrication_orders
        SET status = $2,
            progress_percent = $3,
            workshop_notes = $4,
            target_price = $5,
            deadline = $6,
            specifications = $7::jsonb,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [
        id,
        updated.status,
        updated.progressPercent,
        updated.workshopNotes,
        updated.targetPrice,
        updated.deadline,
        JSON.stringify(updated.specifications || {}),
      ])
      return rows[0] ? mapFabricationOrderRow(rows[0]) : null
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
    async getModelerProject(ownerUserId) {
      const { rows } = await pool.query('SELECT * FROM modeler_projects WHERE owner_user_id = $1 ORDER BY updated_at DESC LIMIT 1', [ownerUserId])
      if (!rows[0]) return null
      const row = rows[0]
      return { id: Number(row.id), ownerUserId: Number(row.owner_user_id), name: row.name, model: row.model, version: Number(row.version), createdAt: row.created_at, updatedAt: row.updated_at }
    },
    async listModelerProjects(ownerUserId) {
      const { rows } = await pool.query('SELECT * FROM modeler_projects WHERE owner_user_id = $1 ORDER BY updated_at DESC', [ownerUserId])
      return rows.map((row)=>({ id:Number(row.id), ownerUserId:Number(row.owner_user_id), name:row.name, model:row.model, version:Number(row.version), createdAt:row.created_at, updatedAt:row.updated_at }))
    },
    async getModelerProjectById(ownerUserId, projectId) {
      const { rows } = await pool.query('SELECT * FROM modeler_projects WHERE owner_user_id = $1 AND id = $2 LIMIT 1',[ownerUserId,projectId]); const row=rows[0]
      return row?{ id:Number(row.id), ownerUserId:Number(row.owner_user_id), name:row.name, model:row.model, version:Number(row.version), createdAt:row.created_at, updatedAt:row.updated_at }:null
    },
    async createModelerProject(ownerUserId, payload) {
      const { rows } = await pool.query('INSERT INTO modeler_projects (owner_user_id,name,model) VALUES ($1,$2,$3::jsonb) RETURNING *',[ownerUserId,payload.name,JSON.stringify(payload.model)]); const row=rows[0]
      return { id:Number(row.id), ownerUserId:Number(row.owner_user_id), name:row.name, model:row.model, version:Number(row.version), createdAt:row.created_at, updatedAt:row.updated_at }
    },
    async saveModelerProject(ownerUserId, payload, projectId = null) {
      if(projectId!=null){
        const { rows }=await pool.query(`UPDATE modeler_projects SET name=$3,model=$4::jsonb,version=version+1,updated_at=NOW() WHERE owner_user_id=$1 AND id=$2 AND version=$5 RETURNING *`,[ownerUserId,projectId,payload.name,JSON.stringify(payload.model),payload.expectedVersion]);const row=rows[0]
        return row?{id:Number(row.id),ownerUserId:Number(row.owner_user_id),name:row.name,model:row.model,version:Number(row.version),createdAt:row.created_at,updatedAt:row.updated_at}:null
      }
      const { rows } = await pool.query(
        `INSERT INTO modeler_projects (owner_user_id,name,model) SELECT $1,$2,$3::jsonb WHERE $4::integer IS NULL RETURNING *`,
        [ownerUserId, payload.name, JSON.stringify(payload.model), payload.expectedVersion]
      )
      if (!rows[0]) return null
      const row = rows[0]
      return { id: Number(row.id), ownerUserId: Number(row.owner_user_id), name: row.name, model: row.model, version: Number(row.version), createdAt: row.created_at, updatedAt: row.updated_at }
    },
  }
}

export async function getRepository() {
  if (isPostgresEnabled()) {
    return getPgRepo()
  }
  return getJsonRepo()
}
