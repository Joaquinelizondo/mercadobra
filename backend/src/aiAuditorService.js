import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI;
let model;

function fallbackAudit(breakdownData) {
  const totals = breakdownData.totals || {}
  const margin = Number(breakdownData.rates?.grossMarginRate || breakdownData.rates?.marginRate || 0.35)
  const directCost = Number(totals.directCostUyu || 0)
  
  const status = margin >= 0.30 ? 'VERDE' : margin >= 0.20 ? 'AMARILLO' : 'ROJO'
  const risks = []
  if (margin < 0.25) risks.push('Margen comercial ajustado por debajo del 25% recomendado.')
  if (directCost > 0 && !totals.freightUyu && !breakdownData.inputs?.includeFreight) risks.push('El flete no está incluido en el costo directo; verificar transporte a obra.')
  if (breakdownData.fallbackVariables?.length > 0) risks.push(`Variables con valor inicial de referencia: ${breakdownData.fallbackVariables.join(', ')}`)

  return {
    status,
    summary: status === 'VERDE'
      ? `Cotización financieramente saludable con margen objetivo del ${(margin * 100).toFixed(1)}% y absorción de costos indirectos.`
      : `Cotización con margen del ${(margin * 100).toFixed(1)}%. Se aconseja validar costos de flete y mano de obra.`,
    risks
  }
}

export async function auditQuoteBreakdown(breakdownData) {
  if (!process.env.GEMINI_API_KEY) {
    return fallbackAudit(breakdownData);
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  const prompt = `Eres el "Auditor Financiero IA" de OXI OS, una metalúrgica.
Tu tarea es auditar el desglose de costos (breakdown) de una cotización y emitir una alerta temprana si detectas riesgos de rentabilidad, errores humanos o desbalances.

DATOS DEL DESGLOSE (JSON):
"""
${JSON.stringify(breakdownData, null, 2)}
"""

INSTRUCCIONES:
1. Evalúa el "Margen Bruto". Si es menor al 20%, el riesgo es ALTO (ROJO). Si es entre 20% y 35% es MEDIO (AMARILLO). Si es mayor a 35% es SANO (VERDE).
2. Analiza el peso de los materiales sobre el total. Si los materiales representan más del 60% del costo total, advierte sobre exposición a la volatilidad del acero (AMARILLO).
3. Revisa la tasa de desperdicio y los gastos generales para asegurar que estén contemplados.

RESPUESTA ESPERADA:
Debes responder ÚNICAMENTE con un objeto JSON (sin markdown, sin backticks) con este formato exacto:
{
  "status": "VERDE" | "AMARILLO" | "ROJO",
  "summary": "Resumen en una oración de la salud financiera del proyecto.",
  "risks": ["Riesgo 1", "Riesgo 2"] // Lista de advertencias (si las hay, sino array vacío)
}
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.warn("Fallo en Gemini AI (Auditor), usando auditor de respaldo:", error.message);
    return fallbackAudit(breakdownData);
  }
}
