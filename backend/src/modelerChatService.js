const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

const FURNITURE_ALIASES = [
  [/\b(cama|colch[oó]n)\b/i, 'bed'],
  [/\b(sof[aá]|sill[oó]n)\b/i, 'sofa'],
  [/\b(mesa)\b/i, 'table'],
  [/\b(silla)\b/i, 'chair'],
  [/\b(placard|ropero|armario)\b/i, 'wardrobe'],
  [/\b(inodoro|wc|v[aá]ter)\b/i, 'toilet'],
]

const ACTION_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['reply', 'requiresConfirmation', 'actions'],
  properties: {
    reply: { type: 'string' },
    requiresConfirmation: { type: 'boolean' },
    actions: { type: 'array', maxItems: 30, items: {
      type: 'object', additionalProperties: false,
      required: ['type', 'width', 'depth', 'height', 'thickness', 'sill', 'furnitureType', 'wallIndex', 'position'],
      properties: {
        type: { type: 'string', enum: ['create_room', 'add_door', 'add_window', 'add_furniture', 'clear_model'] },
        width: { type: ['number', 'null'] }, depth: { type: ['number', 'null'] }, height: { type: ['number', 'null'] },
        thickness: { type: ['number', 'null'] }, sill: { type: ['number', 'null'] },
        furnitureType: { type: ['string', 'null'], enum: ['bed', 'sofa', 'table', 'chair', 'wardrobe', 'toilet', null] },
        wallIndex: { type: ['integer', 'null'] }, position: { type: ['number', 'null'] },
      },
    } },
  },
}

function numberPair(text) {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m(?:etros?)?)?\s*[x×]\s*(\d+(?:[.,]\d+)?)/i)
  return match ? [Number(match[1].replace(',', '.')), Number(match[2].replace(',', '.'))] : null
}

function dimensionsAfter(text, pattern) {
  const match = pattern.exec(text)
  return match ? numberPair(text.slice(match.index, match.index + 80)) : null
}

function action(type, values = {}) {
  return { type, width: null, depth: null, height: null, thickness: null, sill: null, furnitureType: null, wallIndex: null, position: null, ...values }
}

function localPlan(message) {
  const text = String(message).toLowerCase(); const actions = []; const roomDimensions = dimensionsAfter(text, /habitaci[oó]n|cuarto|ambiente|dormitorio/i)
  if (roomDimensions) {
    const height = Number((text.match(/(?:alto|altura|muros? de)\s*(\d+(?:[.,]\d+)?)/)?.[1] || '2.7').replace(',', '.'))
    actions.push(action('create_room', { width: roomDimensions[0], depth: roomDimensions[1], height, thickness: 0.15 }))
  }
  if (/puerta/.test(text)) { const dimensions = dimensionsAfter(text, /puerta/i); actions.push(action('add_door', { width: dimensions?.[0] || 0.9, height: dimensions?.[1] || 2.1, wallIndex: 0, position: 0.5 })) }
  if (/ventana/.test(text)) { const dimensions = dimensionsAfter(text, /ventana/i); actions.push(action('add_window', { width: dimensions?.[0] || 1.2, height: dimensions?.[1] || 1.1, sill: 0.9, wallIndex: 0, position: 0.5 })) }
  for (const [pattern, furnitureType] of FURNITURE_ALIASES) {
    if (!pattern.test(text)) continue
    const defaults = { bed: [1.6, 2, .55], sofa: [2, .85, .8], table: [1.4, .8, .75], chair: [.5, .5, .9], wardrobe: [1.8, .6, 2.2], toilet: [.42, .7, .75] }[furnitureType]
    const dimensions = dimensionsAfter(text, pattern)
    actions.push(action('add_furniture', { furnitureType, width: dimensions?.[0] || defaults[0], depth: dimensions?.[1] || defaults[1], height: defaults[2] }))
  }
  if (/borr[aá]|elimin[aá].*(todo|modelo)|limpi[aá].*modelo/.test(text)) actions.push(action('clear_model'))
  return { reply: actions.length ? `Preparé ${actions.length} ${actions.length === 1 ? 'acción' : 'acciones'} para el modelo.` : 'No pude convertir ese pedido en una acción. Indicá el elemento y sus medidas, por ejemplo: “crear habitación de 4 x 3 m”.', requiresConfirmation: actions.length > 0, actions }
}

async function openAIPlan(message, model) {
  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: 'developer', content: 'Convertí pedidos de modelado arquitectónico en acciones seguras. Respondé en español rioplatense. No inventes tipos fuera del esquema. Usá metros. Para una habitación generá create_room. Para aberturas usá wallIndex base 0 y position entre 0 y 1. Si falta una medida menor, usá valores residenciales razonables. Las eliminaciones totales siempre requieren confirmación.' },
        { role: 'user', content: `Modelo actual: ${JSON.stringify(model)}\nPedido: ${message}` },
      ],
      text: { format: { type: 'json_schema', name: 'modeler_plan', strict: true, schema: ACTION_SCHEMA } },
    }),
  })
  if (!response.ok) throw new Error(`OpenAI ${response.status}`)
  const data = await response.json(); const output = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text
  if (!output) throw new Error('Respuesta estructurada vacía')
  return JSON.parse(output)
}

export async function interpretModelerPrompt({ message, model }) {
  const cleaned = String(message || '').trim().slice(0, 1200)
  if (!OPENAI_API_KEY) return { ...localPlan(cleaned), provider: 'local-fallback' }
  try { return { ...(await openAIPlan(cleaned, model)), provider: OPENAI_MODEL } }
  catch (error) { return { ...localPlan(cleaned), provider: 'local-fallback', fallbackReason: error.message } }
}
