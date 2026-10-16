import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI;
let model;

function fallbackProposal(quoteData) {
  const priceFormatted = `${Number(quoteData.totalAmount || 0).toLocaleString('es-UY')} ${quoteData.currency || 'USD'}`
  return `Estimado cliente, muchas gracias por confiar en Óxida (OXI Platform) para la ejecución de su proyecto. Hemos revisado detalladamente sus requerimientos técnicos para "${quoteData.title || 'su solicitud'}", analizando dimensiones, perfiles estructurales y especificaciones requeridas de acabado y resistencia.

Nuestra propuesta técnica comprende la fabricación en taller homologado con acero seleccionado de primera calidad, corte de precisión, soldaduras continuas bajo norma y tratamiento superficial anticorrosivo de alta durabilidad. El plazo estimado de ejecución es de 15 a 20 días hábiles a partir de la confirmación técnica y seña correspondiente.

La inversión total para la provisión del proyecto es de ${priceFormatted}. Quedamos a su entera disposición para coordinar los detalles constructivos finales y la visita técnica a obra.`
}

export async function generateConstructionProposal(quoteData) {
  if (!process.env.GEMINI_API_KEY) {
    return fallbackProposal(quoteData);
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  const prompt = `Eres un gerente de ventas de una fábrica metalúrgica/constructora (OXI).
Tu trabajo es redactar el texto de la propuesta comercial formal que se le enviará a un cliente (arquitecto o constructora).
Utiliza un tono profesional, claro, directo y vendedor.
NO INVENTES PRECIOS. Solo menciona el precio que se te pasa. 
No dejes placeholders como "[Nombre del cliente]", redactalo directamente para el cliente usando la información provista.

DATOS DE LA SOLICITUD ORIGINAL DEL CLIENTE:
"""
${quoteData.description}
"""

DATOS DE LA COTIZACIÓN (Ingresados por vos / tu sistema):
- Título: ${quoteData.title}
- Presupuesto Total a Cobrar: ${quoteData.totalAmount} ${quoteData.currency}

INSTRUCCIONES:
Redacta un texto persuasivo de 2 o 3 párrafos para el campo "Descripción de la propuesta".
Debe incluir:
1. Agradecimiento por el contacto.
2. Un resumen técnico elegante de lo que le vamos a fabricar/instalar (para demostrar que entendimos el requerimiento).
3. Confirmación del monto de inversión total.
No incluyas saludos finales ni firmas. Solo el cuerpo de la propuesta.
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return result.response.text().trim();
  } catch (error) {
    console.warn("Fallo en Gemini AI (Proposal), usando generador de respaldo:", error.message);
    return fallbackProposal(quoteData);
  }
}
