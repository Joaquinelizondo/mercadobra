import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, 'data', 'db.json')
const SEED_FILE = path.join(__dirname, 'data', 'seed.json')

function ensureDbFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.copyFileSync(SEED_FILE, DATA_FILE)
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
