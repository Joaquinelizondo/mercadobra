/**
 * constructionCalendar.js
 * Utilidades de calendario laboral para la construcción en Uruguay (SUNCA / Grupo 9).
 * Descuenta fines de semana (sábados y domingos) y feriados no laborables de la industria.
 */

// Feriados nacionales no laborables y feriados de la construcción en Uruguay
// Formato MM-DD para feriados fijos, o función para feriados móviles (Carnaval, Turismo, 3er lunes de octubre)
export const URUGUAY_FIXED_HOLIDAYS = [
  '01-01', // Año Nuevo (no laborable)
  '01-06', // Reyes
  '05-01', // Día de los Trabajadores (no laborable)
  '07-18', // Jura de la Constitución (no laborable)
  '08-25', // Declaratoria de la Independencia (no laborable)
  '12-25', // Navidad (no laborable)
]

/**
 * Calcula la fecha de Pascua para un año determinado (algoritmo anónimo de Gauss / Butcher)
 */
function getEasterSunday(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/**
 * Retorna lista de fechas festivas en formato 'YYYY-MM-DD' para un año dado en Uruguay
 */
export function getUruguayHolidaysForYear(year) {
  const holidays = new Set()

  // Fijos
  URUGUAY_FIXED_HOLIDAYS.forEach(mmdd => {
    holidays.add(`${year}-${mmdd}`)
  })

  // Móviles derivados de Pascua:
  const easter = getEasterSunday(year)
  const easterTime = easter.getTime()

  // Carnaval: Lunes (-48 días) y Martes (-47 días) antes de Pascua
  const carnMon = new Date(easterTime - 48 * 86400000)
  const carnTue = new Date(easterTime - 47 * 86400000)
  holidays.add(carnMon.toISOString().slice(0, 10))
  holidays.add(carnTue.toISOString().slice(0, 10))

  // Semana de Turismo: Jueves Santo (-3 días) y Viernes Santo (-2 días)
  const turJue = new Date(easterTime - 3 * 86400000)
  const turVie = new Date(easterTime - 2 * 86400000)
  holidays.add(turJue.toISOString().slice(0, 10))
  holidays.add(turVie.toISOString().slice(0, 10))

  // Día del Trabajador de la Construcción: 3er lunes de Octubre (Ley 19.292)
  const oct1 = new Date(year, 9, 1) // 0-indexed, 9 = Octubre
  let mondaysFound = 0
  let constructionDay = null
  for (let d = 1; d <= 31; d++) {
    const cur = new Date(year, 9, d)
    if (cur.getDay() === 1) { // Lunes
      mondaysFound++
      if (mondaysFound === 3) {
        constructionDay = cur
        break
      }
    }
  }
  if (constructionDay) {
    holidays.add(constructionDay.toISOString().slice(0, 10))
  }

  return holidays
}

const holidaysCache = new Map()

export function isHoliday(dateObj) {
  const year = dateObj.getFullYear()
  if (!holidaysCache.has(year)) {
    holidaysCache.set(year, getUruguayHolidaysForYear(year))
  }
  const dateStr = dateObj.toISOString().slice(0, 10)
  return holidaysCache.get(year).has(dateStr)
}

/**
 * Determina si una fecha es día laborable para la construcción (Lunes a Viernes no festivo).
 */
export function isWorkingDay(dateObj, includeSaturdays = false) {
  const day = dateObj.getDay()
  if (day === 0) return false // Domingo nunca es laborable regular
  if (day === 6 && !includeSaturdays) return false // Sábado no laborable por defecto (régimen 44hs L-V SUNCA)
  return !isHoliday(dateObj)
}

/**
 * Parsea un string de fecha 'YYYY-MM-DD' en hora local evitando desfases UTC
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date()
  if (dateStr instanceof Date) return dateStr
  const parts = dateStr.split(/[-/]/)
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    return new Date(y, m, d, 12, 0, 0)
  }
  return new Date(dateStr)
}

/**
 * Calcula los días hábiles entre dos fechas (inclusive), descontando fines de semana y feriados.
 */
export function calculateWorkingDays(startDate, endDate, includeSaturdays = false) {
  if (!startDate || !endDate) return 1
  const dStart = parseLocalDate(startDate)
  const dEnd = parseLocalDate(endDate)

  if (dStart > dEnd) return 1

  let count = 0
  const cur = new Date(dStart.getTime())
  cur.setHours(12, 0, 0, 0)
  const endTime = dEnd.getTime()

  while (cur.getTime() <= endTime) {
    if (isWorkingDay(cur, includeSaturdays)) {
      count++
    }
    cur.setDate(cur.getDate() + 1)
  }

  return Math.max(1, count)
}

/**
 * Retorna el nombre del mes y año en español rioplatense (ej. 'Set. 2026', 'Oct. 2026')
 */
const MONTH_NAMES_ES = [
  'Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.',
  'Jul.', 'Ago.', 'Set.', 'Oct.', 'Nov.', 'Dic.'
]

export function formatMonthLabel(year, monthZeroIndexed) {
  return `${MONTH_NAMES_ES[monthZeroIndexed]} ${year}`
}

export function getMonthKeyFromDate(dateStr) {
  const d = parseLocalDate(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Distribuye un costo o presupuesto a lo largo de los meses calendarios que abarca la tarea,
 * proporcionalmente a los días hábiles contenidos en cada mes.
 * Resuelve el Ítem 2: "'Mes asignado' debe salir de las fechas de la tarea".
 */
export function distributeCostByMonths(startDate, endDate, totalCost = 0, includeSaturdays = false) {
  if (!startDate || !endDate) {
    return []
  }

  const dStart = parseLocalDate(startDate)
  const dEnd = parseLocalDate(endDate)

  if (dStart > dEnd) {
    return []
  }

  // Agrupar días hábiles por clave 'YYYY-MM'
  const monthDaysMap = new Map()
  let totalWorkDays = 0

  const cur = new Date(dStart.getTime())
  cur.setHours(12, 0, 0, 0)
  const endTime = dEnd.getTime()

  while (cur.getTime() <= endTime) {
    if (isWorkingDay(cur, includeSaturdays)) {
      totalWorkDays++
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = formatMonthLabel(cur.getFullYear(), cur.getMonth())
      if (!monthDaysMap.has(key)) {
        monthDaysMap.set(key, { key, monthLabel, workDays: 0, year: cur.getFullYear(), month: cur.getMonth() })
      }
      monthDaysMap.get(key).workDays++
    }
    cur.setDate(cur.getDate() + 1)
  }

  if (totalWorkDays === 0) {
    totalWorkDays = 1
    const key = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, '0')}`
    monthDaysMap.set(key, {
      key,
      monthLabel: formatMonthLabel(dStart.getFullYear(), dStart.getMonth()),
      workDays: 1,
      year: dStart.getFullYear(),
      month: dStart.getMonth()
    })
  }

  const breakdown = []
  let assignedCost = 0
  const entries = Array.from(monthDaysMap.values())

  entries.forEach((entry, idx) => {
    const ratio = entry.workDays / totalWorkDays
    // Último elemento absorbe cualquier diferencia de redondeo de centavos
    const isLast = idx === entries.length - 1
    const cost = isLast ? Math.round(totalCost - assignedCost) : Math.round(totalCost * ratio)
    assignedCost += cost

    breakdown.push({
      key: entry.key,
      monthLabel: entry.monthLabel,
      workDays: entry.workDays,
      percent: Math.round(ratio * 100),
      cost
    })
  })

  return {
    totalWorkDays,
    breakdown,
    primaryMonthLabel: breakdown.length === 1
      ? breakdown[0].monthLabel
      : `${breakdown[0].monthLabel} - ${breakdown[breakdown.length - 1].monthLabel}`
  }
}
