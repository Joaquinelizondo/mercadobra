import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Usamos el modelo rápido y costo-efectivo para extracción de texto
let genAI;
let model;

export async function parseConstructionRequirement(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('La clave GEMINI_API_KEY no está configurada en las variables de entorno.');
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  const prompt = `Eres un ingeniero cotizador experto en la plataforma OXI OS. 
Tu trabajo es leer el siguiente requerimiento desestructurado de un arquitecto o constructora, 
identificar qué productos o estructuras de hierro/madera/vidrio necesitan, y extraer las 
variables paramétricas (largo, alto, cantidad, terminación).

Extrae toda la información posible. Si falta un dato crítico (por ejemplo, piden una baranda pero no dicen cuántos metros),
anótalo en "missing_critical_info".

REQUERIMIENTO DEL CLIENTE:
"""
${text}
"""
`;

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      detected_items: {
        type: SchemaType.ARRAY,
        description: "Lista de productos o estructuras identificadas en el requerimiento.",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            product_type: { type: SchemaType.STRING, description: "Tipo de producto. Ej: Baranda, Pérgola, Divisor, Puerta, etc." },
            quantity: { type: SchemaType.INTEGER, description: "Cantidad solicitada del producto. Si no se especifica, asume 1." },
            material: { type: SchemaType.STRING, description: "Material principal mencionado. Ej: Hierro negro, Aluminio, Vidrio repartido." },
            dimensions: {
              type: SchemaType.OBJECT,
              properties: {
                length_m: { type: SchemaType.NUMBER, description: "Largo total en metros." },
                height_m: { type: SchemaType.NUMBER, description: "Altura total en metros." }
              }
            },
            finish: { type: SchemaType.STRING, description: "Terminación o pintura. Ej: Pintura electrostática negra." },
            assumptions: { type: SchemaType.STRING, description: "Cualquier suposición lógica que hiciste al leer el texto." }
          },
          required: ["product_type", "quantity"]
        }
      },
      global_notes: { type: SchemaType.STRING, description: "Notas generales sobre el proyecto o las condiciones de entrega/instalación." },
      missing_critical_info: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Lista de preguntas o datos que el arquitecto olvidó mencionar y son necesarios para cotizar."
      }
    },
    required: ["detected_items", "missing_critical_info"]
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Error en Gemini AI:", error);
    throw new Error('No se pudo procesar el requerimiento con IA.');
  }
}
