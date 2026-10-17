import PDFDocument from 'pdfkit'

const INK = '#0f172a'
const DARK = '#1e293b'
const OXIDE = '#ea580c'
const BLUE = '#2563eb'
const GREEN = '#16a34a'
const RED = '#ef4444'
const MUTED = '#64748b'
const LIGHT_BG = '#f8fafc'
const CARD_BORDER = '#e2e8f0'
const LINE = '#cbd5e1'
const WHITE = '#ffffff'

function money(amount) {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 0
  }).format(Number(amount || 0))
}

function header(doc, pageTitle) {
  // Brand title
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(14).text('ÓXIDA', 40, 36, { continued: true })
  doc.fillColor(OXIDE).text(' · ', { continued: true })
  doc.fillColor(INK).text('OXIPRO ', { continued: true })
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('SUITE DE INGENIERÍA & CONTROL DE OBRA')

  // Page title right
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(pageTitle, 250, 38, { width: 305, align: 'right' })

  // Accent divider line
  doc.strokeColor(OXIDE).lineWidth(1.2).moveTo(40, 60).lineTo(555, 60).stroke()
}

function footer(doc, pageNum, totalPages = 4) {
  doc.strokeColor(LINE).lineWidth(0.6).moveTo(40, 796).lineTo(555, 796).stroke()
  doc.fillColor(MUTED).font('Helvetica').fontSize(7)
    .text('OxI Pro Suite · Óxida Studio & Mercadobra | Confidencial - Uso exclusivo de Dirección de Obra', 40, 804)
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(8)
    .text(`Pág. ${pageNum} de ${totalPages}`, 500, 804, { width: 55, align: 'right' })
}

export function createOxiProReportPdf({ project = {}, schedule = [], rubros = [], rainLogs = [], metrics = {}, user = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Informe Ejecutivo - ${project.name || 'Obra'}`,
          Author: 'OxI Pro Suite by Óxida Studio',
          Subject: 'Control de Ingeniería, Cronograma y Finanzas de Obra'
        }
      })

      const chunks = []
      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const projectName = project.name || 'Torre Brisas del Puerto'
      const projectLocation = project.location || 'Rambla República de México 5420, Montevideo'
      const companyName = user.company || user.name || 'Constructora Homologada'
      const emitDate = new Date().toLocaleDateString('es-UY')

      const totalRainDays = rainLogs.reduce((sum, log) => sum + (Number(log.days) || 0), 0)

      // =========================================================================
      // PÁGINA 1: FICHA TÉCNICA Y TABLERO DE CONTROL (KPIs)
      // =========================================================================
      header(doc, '01. TABLERO DE CONTROL EJECUTIVO')

      // Ficha Técnica Recuadro
      doc.rect(40, 75, 515, 88).fill(LIGHT_BG)
      doc.rect(40, 75, 515, 88).strokeColor(CARD_BORDER).lineWidth(1).stroke()
      doc.rect(40, 75, 4, 88).fill(OXIDE)

      doc.fillColor(OXIDE).font('Helvetica-Bold').fontSize(7.5).text('FICHA TÉCNICA DEL PROYECTO', 52, 85)
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(14).text(projectName, 52, 97, { width: 490, ellipsis: true })

      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Ubicación de Obra:', 52, 120)
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(8).text(projectLocation, 130, 120, { width: 230, ellipsis: true })

      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Empresa / Comitente:', 52, 135)
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(8).text(companyName, 130, 135, { width: 230, ellipsis: true })

      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Fecha de Emisión:', 380, 120)
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(8).text(emitDate, 460, 120)

      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Nivel de Plataforma:', 380, 135)
      doc.fillColor(OXIDE).font('Helvetica-Bold').fontSize(8).text('OxI PRO SUITE', 460, 135)

      // Sección KPIs Físicos
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5).text('SEGUIMIENTO FÍSICO Y CUMPLIMIENTO DE CRONOGRAMA', 40, 180)
      doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(40, 194).lineTo(555, 194).stroke()

      const kpiCardsPhysical = [
        {
          label: 'AVANCE PLAN (P0)',
          val: `${metrics.plannedGlobalProgress || 0}%`,
          sub: 'Meta contractual',
          color: BLUE
        },
        {
          label: 'REAL CERTIFICADO',
          val: `${metrics.globalProgress || 0}%`,
          sub: 'Avance físico en sitio',
          color: (metrics.globalDelta || 0) >= 0 ? GREEN : OXIDE
        },
        {
          label: 'DESVÍO FÍSICO (SV)',
          val: `${(metrics.globalDelta || 0) > 0 ? '+' : ''}${metrics.globalDelta || 0}%`,
          sub: (metrics.globalDelta || 0) >= 0 ? '✓ En plazo / Adelanto' : '⚠️ Atraso en plazo',
          color: (metrics.globalDelta || 0) >= 0 ? GREEN : OXIDE
        },
        {
          label: 'ÍNDICE PLAZO (SPI)',
          val: `${metrics.spiIndex || '1.00'}`,
          sub: Number(metrics.spiIndex || 1) >= 1 ? '✓ Ritmo Óptimo (≥ 1.0)' : '⚠️ Requiere Aceleración',
          color: Number(metrics.spiIndex || 1) >= 1 ? GREEN : OXIDE
        }
      ]

      let kx = 40
      const kw = 122
      kpiCardsPhysical.forEach(c => {
        doc.rect(kx, 204, kw, 62).fill(WHITE)
        doc.rect(kx, 204, kw, 62).strokeColor(CARD_BORDER).lineWidth(1).stroke()

        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(6.5).text(c.label, kx + 8, 212)
        doc.fillColor(c.color).font('Helvetica-Bold').fontSize(16).text(c.val, kx + 8, 224)
        doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text(c.sub, kx + 8, 248, { width: kw - 16, ellipsis: true })
        kx += kw + 9
      })

      // Sección KPIs Financieros
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5).text('CONTROL FINANCIERO Y EJECUCIÓN PRESUPUESTARIA', 40, 282)
      doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(40, 296).lineTo(555, 296).stroke()

      const kpiCardsFinancial = [
        {
          label: 'PRESUPUESTO TOTAL AUTORIZADO',
          val: money(metrics.totalProjectBudget || 0),
          sub: 'Mano de Obra + Leyes Sociales BPS + Materiales',
          color: INK
        },
        {
          label: 'COSTO DEVENGADO / CERTIFICADO',
          val: money(metrics.totalExecutedCost || 0),
          sub: `${metrics.globalProgress || 0}% del presupuesto total devengado`,
          color: OXIDE
        },
        {
          label: 'SALDO RESTANTE DISPONIBLE',
          val: money(metrics.totalBalanceCost || 0),
          sub: 'Fondos remanentes para culminación',
          color: GREEN
        }
      ]

      let fx = 40
      const fw = 165
      kpiCardsFinancial.forEach(c => {
        doc.rect(fx, 306, fw, 64).fill(WHITE)
        doc.rect(fx, 306, fw, 64).strokeColor(CARD_BORDER).lineWidth(1).stroke()

        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(6.5).text(c.label, fx + 10, 314)
        doc.fillColor(c.color).font('Helvetica-Bold').fontSize(14).text(c.val, fx + 10, 328)
        doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text(c.sub, fx + 10, 350, { width: fw - 20, ellipsis: true })
        fx += fw + 10
      })

      // Sección Lluvias y Régimen Climático
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5).text('RÉGIMEN DE LLUVIAS & SUSPENSIÓN DE PLAZOS EN CASCADA', 40, 386)
      doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(40, 400).lineTo(555, 400).stroke()

      doc.rect(40, 408, 515, 60).fill(LIGHT_BG)
      doc.rect(40, 408, 515, 60).strokeColor(CARD_BORDER).lineWidth(1).stroke()

      doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(22).text(String(totalRainDays), 56, 420)
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7).text('DÍAS DE LLUVIA', 56, 448)

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text('Corrimiento Automático de Cronograma Activo', 125, 418)
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(
        `Se han homologado ${rainLogs.length} actas de suspensión técnica por lluvias o factores climáticos adversos. ` +
        `El sistema desplazó en cascada las fechas de inicio y fin de todas las tareas en curso y futuras, ` +
        `garantizando la duración contractual y preservando intactas las tareas 100% finalizadas.`,
        125, 432, { width: 415, lineGap: 2 }
      )

      // Resumen Ejecutivo de Dirección de Obra
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5).text('SÍNTESIS EJECUTIVA DE LA DIRECCIÓN DE OBRA', 40, 484)
      doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(40, 498).lineTo(555, 498).stroke()

      const observations = [
        `Ritmo y Desempeño: La obra registra un avance físico del ${metrics.globalProgress || 0}% frente a un plan contractual del ${metrics.plannedGlobalProgress || 0}% (${(metrics.globalDelta || 0) >= 0 ? 'obra adelantada en plazo' : 'desvío temporal en fase de recuperación'}).`,
        `Régimen de Aportes: El presupuesto incorpora la discriminación de Leyes Sociales de la Construcción (BPS ~65%) sobre la mano de obra imponible, según pautas del MTSS / BPS.`,
        `Flujo Financiero: Se han certificado ${money(metrics.totalExecutedCost || 0)} con un saldo financiero remanente de ${money(metrics.totalBalanceCost || 0)}.`,
        `Garantía de Suministros Metálicos: Paquetes y estructuras de herrería coordinadas con la red de fabricación homologada Óxida Network.`
      ]

      let oy = 508
      observations.forEach(obs => {
        doc.fillColor(OXIDE).fontSize(10).text('•', 45, oy)
        doc.fillColor(INK).font('Helvetica').fontSize(8).text(obs, 56, oy + 1, { width: 495, lineGap: 2 })
        oy += 28
      })

      // Cuadro de sellos rápidos
      doc.rect(40, 640, 515, 120).strokeColor(LINE).lineWidth(0.8).stroke()
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7).text('DICTAMEN DE CONFORMIDAD TÉCNICA - EMISIÓN OFICIAL', 52, 650)
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(
        'El presente documento resume los indicadores auditados y certificados en la Suite OxI Pro al momento de la fecha. ' +
        'Es apto para ser remitido a entidades financieras, comitentes inversores y directores de proyecto.',
        52, 665, { width: 490 }
      )

      doc.strokeColor(LINE).lineWidth(0.6).moveTo(65, 735).lineTo(250, 735).stroke()
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(7).text('DIRECCIÓN DE OBRA', 65, 742)
      doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text('Firma y Aclaración Profesional', 65, 750)

      doc.strokeColor(LINE).lineWidth(0.6).moveTo(340, 735).lineTo(525, 735).stroke()
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(7).text('JEFATURA DE OBRA / CONSTRUCTORA', 340, 742)
      doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text('Firma y Conformidad de Empresa', 340, 750)

      footer(doc, 1, 4)

      // =========================================================================
      // PÁGINA 2: CRONOGRAMA DETALLADO DE TAREAS & RECURSOS (GANTT)
      // =========================================================================
      doc.addPage()
      header(doc, '02. CRONOGRAMA DE TAREAS & RECURSOS')

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5).text('PLANIFICACIÓN TEMPORAL Y DEVENGAMIENTO POR PARTIDA', 40, 75)
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(
        'Partidas programadas con control de días hábiles, categoría salarial, % previsto vs real y saldo.',
        40, 88
      )

      // Tabla Header
      const ty = 104
      doc.rect(40, ty, 515, 20).fill(INK)
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(6.5)
      doc.text('PARTIDA / TAREA DE OBRA', 46, ty + 6, { width: 155 })
      doc.text('PLAZO (INICIO - FIN)', 203, ty + 6, { width: 95 })
      doc.text('CUADRILLA', 300, ty + 6, { width: 55 })
      doc.text('% PLAN', 357, ty + 6, { width: 32, align: 'right' })
      doc.text('% REAL', 391, ty + 6, { width: 32, align: 'right' })
      doc.text('DESVÍO', 425, ty + 6, { width: 42, align: 'right' })
      doc.text('PRESUPUESTO ($)', 469, ty + 6, { width: 80, align: 'right' })

      let rowY = ty + 20
      const rowH = 26

      schedule.slice(0, 16).forEach((task, idx) => {
        const isEven = idx % 2 === 0
        doc.rect(40, rowY, 515, rowH).fill(isEven ? WHITE : LIGHT_BG)
        doc.rect(40, rowY, 515, rowH).strokeColor(CARD_BORDER).lineWidth(0.5).stroke()

        const taskBudget = (task.assignedLaborCost || 0) + (task.socialLawsCost || Math.round((task.assignedLaborCost || 0) * 0.65)) + (task.materialCost || 0)
        const plannedPct = Math.min(100, Math.max(0, Number(task.plannedPercent) || 0))
        const realPct = Math.min(100, Math.max(0, Number(task.progressPercent) || 0))
        const delta = realPct - plannedPct
        const deltaColor = delta > 0 ? GREEN : delta < 0 ? RED : MUTED

        // Task name
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(7)
          .text(task.name || `Tarea #${idx + 1}`, 46, rowY + 5, { width: 150, ellipsis: true })
        doc.fillColor(MUTED).font('Helvetica').fontSize(6)
          .text(`Cat: ${task.category || 'Oficial'} (${money(task.categoryRate || 0)}/d)`, 46, rowY + 15, { width: 150, ellipsis: true })

        // Dates
        doc.fillColor(DARK).font('Helvetica').fontSize(6.5)
          .text(`${task.startDate || 'N/A'} al ${task.endDate || 'N/A'}`, 203, rowY + 9, { width: 95 })

        // People
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7)
          .text(`${task.peopleCount || 1} op.`, 300, rowY + 9, { width: 55 })

        // % Plan
        doc.fillColor(MUTED).font('Helvetica').fontSize(7)
          .text(`${plannedPct}%`, 357, rowY + 9, { width: 32, align: 'right' })

        // % Real
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(7)
          .text(`${realPct}%`, 391, rowY + 9, { width: 32, align: 'right' })

        // Desvío
        doc.fillColor(deltaColor).font('Helvetica-Bold').fontSize(7)
          .text(`${delta > 0 ? '+' : ''}${delta}%`, 425, rowY + 9, { width: 42, align: 'right' })

        // Budget
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(7)
          .text(money(taskBudget), 469, rowY + 6, { width: 80, align: 'right' })
        doc.fillColor(MUTED).font('Helvetica').fontSize(5.5)
          .text(`Ej: ${money(Math.round(taskBudget * (realPct / 100)))}`, 469, rowY + 16, { width: 80, align: 'right' })

        rowY += rowH
      })

      // Fila de totales en pie
      doc.rect(40, rowY, 515, 22).fill('#f1f5f9')
      doc.rect(40, rowY, 515, 22).strokeColor(LINE).lineWidth(1).stroke()

      doc.fillColor(INK).font('Helvetica-Bold').fontSize(7).text('TOTALES CONSOLIDADOS DEL CRONOGRAMA', 46, rowY + 7)
      doc.text(`${metrics.plannedGlobalProgress || 0}% Plan`, 350, rowY + 7, { width: 39, align: 'right' })
      doc.text(`${metrics.globalProgress || 0}% Real`, 391, rowY + 7, { width: 32, align: 'right' })
      doc.fillColor((metrics.globalDelta || 0) >= 0 ? GREEN : RED)
        .text(`${(metrics.globalDelta || 0) > 0 ? '+' : ''}${metrics.globalDelta || 0}%`, 425, rowY + 7, { width: 42, align: 'right' })
      doc.fillColor(INK).text(money(metrics.totalProjectBudget || 0), 469, rowY + 7, { width: 80, align: 'right' })

      footer(doc, 2, 4)

      // =========================================================================
      // PÁGINA 3: BALANCE PRESUPUESTARIO POR RUBRO & LEYES SOCIALES (BPS)
      // =========================================================================
      doc.addPage()
      header(doc, '03. PRESUPUESTO & LEYES SOCIALES POR RUBRO')

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5).text('DESGLOSE POR ESPECIALIDAD DE OBRA (BPS ~65% & MATERIALES)', 40, 75)
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(
        'Discriminación de Mano de Obra, Aportes BPS y Subcontratos con alertas de sobrecosto.',
        40, 88
      )

      // Tabla Header
      const ry = 104
      doc.rect(40, ry, 515, 20).fill(INK)
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(6.5)
      doc.text('RUBRO / ESPECIALIDAD', 46, ry + 6, { width: 140 })
      doc.text('MANO OBRA ($)', 188, ry + 6, { width: 55, align: 'right' })
      doc.text('LEYES BPS ($)', 245, ry + 6, { width: 55, align: 'right' })
      doc.text('MATERIALES ($)', 302, ry + 6, { width: 62, align: 'right' })
      doc.text('PRESUPUESTO ($)', 366, ry + 6, { width: 66, align: 'right' })
      doc.text('EJECUTADO ($)', 434, ry + 6, { width: 60, align: 'right' })
      doc.text('ESTADO / %', 496, ry + 6, { width: 55, align: 'right' })

      let rubroRowY = ry + 20
      const rubroH = 25

      rubros.forEach((r, idx) => {
        const isEven = idx % 2 === 0
        doc.rect(40, rubroRowY, 515, rubroH).fill(isEven ? WHITE : LIGHT_BG)
        doc.rect(40, rubroRowY, 515, rubroH).strokeColor(CARD_BORDER).lineWidth(0.5).stroke()

        const labor = Number(r.laborCost != null ? r.laborCost : Math.round((Number(r.budgeted) || 0) * 0.35))
        const social = Number(r.socialLawsCost != null ? r.socialLawsCost : Math.round(labor * 0.65))
        const material = Number(r.materialCost != null ? r.materialCost : Math.max(0, (Number(r.budgeted) || 0) - labor - social))
        const total = (r.laborCost != null || r.socialLawsCost != null || r.materialCost != null) ? (labor + social + material) : (Number(r.budgeted) || 0)
        const executed = Number(r.executed) || 0
        const percent = Math.round((executed / (total || 1)) * 100)

        const statusLabel = percent > 100 ? 'SOBRECOSTO' : percent >= 85 ? 'LÍMITE' : 'NORMAL'
        const statusColor = percent > 100 ? RED : percent >= 85 ? OXIDE : GREEN

        doc.fillColor(INK).font('Helvetica-Bold').fontSize(7)
          .text(r.name || `Rubro #${idx + 1}`, 46, rubroRowY + 8, { width: 140, ellipsis: true })

        doc.fillColor(DARK).font('Helvetica').fontSize(6.5)
          .text(money(labor), 188, rubroRowY + 8, { width: 55, align: 'right' })

        doc.fillColor(DARK).font('Helvetica').fontSize(6.5)
          .text(money(social), 245, rubroRowY + 8, { width: 55, align: 'right' })

        doc.fillColor(DARK).font('Helvetica').fontSize(6.5)
          .text(money(material), 302, rubroRowY + 8, { width: 62, align: 'right' })

        doc.fillColor(INK).font('Helvetica-Bold').fontSize(6.5)
          .text(money(total), 366, rubroRowY + 8, { width: 66, align: 'right' })

        doc.fillColor(OXIDE).font('Helvetica-Bold').fontSize(6.5)
          .text(money(executed), 434, rubroRowY + 8, { width: 60, align: 'right' })

        doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(6)
          .text(`${percent}% ${statusLabel}`, 496, rubroRowY + 8, { width: 55, align: 'right' })

        rubroRowY += rubroH
      })

      // Fila de totales de rubros
      doc.rect(40, rubroRowY, 515, 22).fill('#f1f5f9')
      doc.rect(40, rubroRowY, 515, 22).strokeColor(LINE).lineWidth(1).stroke()

      doc.fillColor(INK).font('Helvetica-Bold').fontSize(7).text('TOTAL CONSOLIDADO RUBROS', 46, rubroRowY + 7)
      doc.text(money(metrics.totalProjectBudget || 0), 366, rubroRowY + 7, { width: 66, align: 'right' })
      doc.fillColor(OXIDE).text(money(metrics.totalExecutedCost || 0), 434, rubroRowY + 7, { width: 60, align: 'right' })
      doc.fillColor(GREEN).text(money(metrics.totalBalanceCost || 0), 496, rubroRowY + 7, { width: 55, align: 'right' })

      // Cuadro de Resumen Legal BPS y Marco Regulatorio
      doc.rect(40, 480, 515, 120).fill(LIGHT_BG)
      doc.rect(40, 480, 515, 120).strokeColor(CARD_BORDER).lineWidth(1).stroke()

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8.5).text('BASE DE CÁLCULO DE LEYES SOCIALES DE LA CONSTRUCCIÓN (BPS)', 52, 492)
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(
        'En Uruguay, el régimen laboral de la construcción se encuentra regulado por el Decreto 451/006, la Ley 14.411 ' +
        'y los convenios colectivos del Consejo de Salarios (Grupo 09). La alícuota promedio unificada de aportes patronales ' +
        'al Banco de Previsión Social (BPS) ronda el 65% sobre la masa salarial básica devengada, cubriendo:\n\n' +
        '• Cargas de Seguridad Social, Jubilación y Fondo Nacional de Salud (FONASA).\n' +
        '• Seguro de Accidentes de Trabajo y Enfermedades Profesionales (BSE).\n' +
        '• Fondo de Cesantía y Retiro (FOCER) y Fondo de Capacitación (FOCAP).\n\n' +
        'OxI Pro permite la edición paramétrica por rubro para ajustarse con precisión a cada laudo y régimen de subcontrato.',
        52, 508, { width: 490, lineGap: 2.5 }
      )

      footer(doc, 3, 4)

      // =========================================================================
      // PÁGINA 4: ACTAS DE LLUVIA & CONFORMIDAD TÉCNICA
      // =========================================================================
      doc.addPage()
      header(doc, '04. ACTAS DE LLUVIA & CONFORMIDAD TÉCNICA')

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5).text('HISTORIAL DE DEMORAS CLIMÁTICAS Y ACTAS HOMOLOGADAS', 40, 75)
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(
        'Registro de eventos climáticos con suspensión justificada de plazos de obra.',
        40, 88
      )

      // Tabla de lluvias
      const ly = 104
      doc.rect(40, ly, 515, 20).fill(INK)
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(6.5)
      doc.text('FECHA DEL EVENTO', 46, ly + 6, { width: 80 })
      doc.text('DÍAS', 128, ly + 6, { width: 35 })
      doc.text('CAUSA HOMOLOGADA', 165, ly + 6, { width: 140 })
      doc.text('DOCUMENTO ASOCIADO', 307, ly + 6, { width: 120 })
      doc.text('ESTADO', 430, ly + 6, { width: 120, align: 'right' })

      let rainRowY = ly + 20
      const rainH = 26

      if (rainLogs.length === 0) {
        doc.rect(40, rainRowY, 515, 36).fill(LIGHT_BG)
        doc.rect(40, rainRowY, 515, 36).strokeColor(CARD_BORDER).lineWidth(0.5).stroke()
        doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(8)
          .text('No se registran suspensiones ni demoras climáticas a la fecha.', 52, rainRowY + 13)
        rainRowY += 45
      } else {
        rainLogs.slice(0, 10).forEach((log, idx) => {
          const isEven = idx % 2 === 0
          doc.rect(40, rainRowY, 515, rainH).fill(isEven ? WHITE : LIGHT_BG)
          doc.rect(40, rainRowY, 515, rainH).strokeColor(CARD_BORDER).lineWidth(0.5).stroke()

          doc.fillColor(INK).font('Helvetica-Bold').fontSize(7)
            .text(log.date || 'N/A', 46, rainRowY + 9, { width: 80 })

          doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7)
            .text(`+${log.days || 1} d`, 128, rainRowY + 9, { width: 35 })

          doc.fillColor(DARK).font('Helvetica').fontSize(7)
            .text(log.cause || 'Lluvia intensa y precipitaciones', 165, rainRowY + 5, { width: 140, ellipsis: true })
          doc.fillColor(MUTED).font('Helvetica').fontSize(5.5)
            .text(log.notes || 'Suspensión autorizada', 165, rainRowY + 15, { width: 140, ellipsis: true })

          doc.fillColor(MUTED).font('Helvetica').fontSize(6.5)
            .text(`Acta_Suspension_Lluvia_${log.date || 'Acta'}.pdf`, 307, rainRowY + 9, { width: 120, ellipsis: true })

          doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(6.5)
            .text('✓ HOMOLOGADA', 430, rainRowY + 9, { width: 120, align: 'right' })

          rainRowY += rainH
        })
      }

      // Declaración Jurada de Conformidad
      const declY = Math.max(rainRowY + 20, 320)
      doc.rect(40, declY, 515, 75).fill(LIGHT_BG)
      doc.rect(40, declY, 515, 75).strokeColor(CARD_BORDER).lineWidth(1).stroke()

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8).text('DECLARACIÓN DE VALIDEZ TÉCNICA Y CONTRACTUAL', 52, declY + 12)
      doc.fillColor(MUTED).font('Helvetica').fontSize(7).text(
        'Las partes firmantes declaran que los datos consignados en este informe ejecutivo reflejan fielmente el estado físico, ' +
        'temporal y económico de la obra. Las tareas, avances porcentuales y devengamientos han sido verificados en sitio por ' +
        'la Dirección Técnica, y las prórrogas por lluvia se encuentran debidamente justificadas mediante acta técnica incorporada ' +
        'al Gestor Documental de la Suite OxI Pro.',
        52, declY + 26, { width: 490, lineGap: 2.5 }
      )

      // 3 Bloques de Firmas Formales
      const sigY = declY + 120
      const sigW = 155

      // Firma 1: Dirección de Obra
      doc.strokeColor(LINE).lineWidth(0.8).moveTo(40, sigY + 60).lineTo(40 + sigW, sigY + 60).stroke()
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(8).text('DIRECCIÓN DE OBRA', 40, sigY + 68, { width: sigW, align: 'center' })
      doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text('Arquitectura / Ingeniería Civil', 40, sigY + 80, { width: sigW, align: 'center' })
      doc.text('Matrícula Profesional / SAU', 40, sigY + 90, { width: sigW, align: 'center' })

      // Firma 2: Empresa Constructora
      doc.strokeColor(LINE).lineWidth(0.8).moveTo(220, sigY + 60).lineTo(220 + sigW, sigY + 60).stroke()
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(8).text('JEFATURA DE OBRA', 220, sigY + 68, { width: sigW, align: 'center' })
      doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text(companyName, 220, sigY + 80, { width: sigW, align: 'center' })
      doc.text('Representación Técnica', 220, sigY + 90, { width: sigW, align: 'center' })

      // Firma 3: Fiscalización / Comitente
      doc.strokeColor(LINE).lineWidth(0.8).moveTo(400, sigY + 60).lineTo(400 + sigW, sigY + 60).stroke()
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(8).text('COMITENTE / FISCALIZACIÓN', 400, sigY + 68, { width: sigW, align: 'center' })
      doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text('Propietario / Inversor', 400, sigY + 80, { width: sigW, align: 'center' })
      doc.text('Conformidad de Avance', 400, sigY + 90, { width: sigW, align: 'center' })

      footer(doc, 4, 4)

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
