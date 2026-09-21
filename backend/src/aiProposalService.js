import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI;
let model;

export async function generateConstructionProposal(quoteData) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('La clave GEMINI_API_KEY no está configurada.');
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
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
    console.error("Error en Gemini AI (Proposal):", error);
    throw new Error('No se pudo redactar la propuesta con IA.');
  }
}
