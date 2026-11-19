import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './authService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, 'data', 'db.json')
const SEED_FILE = path.join(__dirname, 'data', 'seed.json')

function ensureDbFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.copyFileSync(SEED_FILE, DATA_FILE)
  }

  // Keep long-lived local databases compatible when new built-in accounts are
  // added to the seed, without replacing orders, products, or user changes.
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'))
  const users = Array.isArray(data.users) ? data.users : []
  let modified = false

  // Migrar cualquier contraseña en texto plano existente a scrypt seguro
  for (const user of users) {
    if (user.password && !String(user.password).startsWith('scrypt$')) {
      user.password = hashPassword(user.password)
      modified = true
    }
  }

  const seedUsers = Array.isArray(seed.users) ? seed.users : []
  const existingEmails = new Set(users.map((user) => String(user.email).toLowerCase()))
  const missingUsers = seedUsers.filter(
    (user) => !existingEmails.has(String(user.email).toLowerCase())
  )

  if (missingUsers.length) {
    let availableId = nextId(users)
    const usedIds = new Set(users.map((user) => Number(user.id)))
    const compatibleUsers = missingUsers.map((user) => {
      const seedId = Number(user.id)
      const id = Number.isInteger(seedId) && !usedIds.has(seedId) ? seedId : availableId++
      usedIds.add(id)
      const pass = user.password && String(user.password).startsWith('scrypt$') ? user.password : hashPassword(user.password)
      return { ...user, id, password: pass }
    })
    users.push(...compatibleUsers)
    modified = true
  }

  if (modified) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ ...data, users }, null, 2),
      'utf8'
    )
  }
}

export function readDb() {
  ensureDbFile()
  const raw = fs.readFileSync(DATA_FILE, 'utf8')
  return JSON.parse(raw)
}

export function writeDb(nextData) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(nextData, null, 2), 'utf8')
}

export function nextId(collection) {
  if (!collection.length) return 1
  return Math.max(...collection.map((item) => Number(item.id) || 0)) + 1
}
