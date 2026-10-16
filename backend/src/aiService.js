import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

let genAI;
let model;

function heuristicParseRequirement(text) {
  const clean = String(text || '').toLowerCase();
  
  let suggestedTemplate = 'OXI_DIVIDER_D01';
  let productType = 'Estructura Metálica Paramétrica';
  
  if (clean.includes('baranda') || clean.includes('balcon') || clean.includes('balcón') || clean.includes('pasamano')) {
    suggestedTemplate = 'OXI_RAILING_R01';
    productType = 'Baranda de Balcón / Escalera OXI';
  } else if (clean.includes('pergola') || clean.includes('pérgola') || clean.includes('alero') || clean.includes('galeria') || clean.includes('galería') || clean.includes('techo')) {
    suggestedTemplate = 'OXI_PERGOLA_P01';
    productType = 'Pérgola Metálica Exterior OXI';
  } else if (clean.includes('mesa')) {
    suggestedTemplate = 'MESA_CIRCULAR_001';
    productType = 'Mesa Circular OXI';
  } else if (clean.includes('divisor') || clean.includes('mampara') || clean.includes('cerramiento') || clean.includes('puerta') || clean.includes('porton') || clean.includes('portón')) {
    suggestedTemplate = 'OXI_DIVIDER_D01';
    productType = 'Divisor de Ambientes / Cerramiento OXI';
  }

  // Extract dimensions
  let lengthM = null;
  let heightM = null;

  // 1. Look for dimensions with explicit descriptors (e.g. "4m de largo", "1 metro de alto")
  const lExplicit = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros?|mts?)?\s*(?:de\s*)?(?:largo|ancho|longitud)/);
  if (lExplicit) lengthM = parseFloat(lExplicit[1].replace(',', '.'));

  const hExplicit = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros?|mts?)?\s*(?:de\s*)?(?:alto|altura)/);
  if (hExplicit) heightM = parseFloat(hExplicit[1].replace(',', '.'));

  // 2. Patterns like "4x1", "4 x 1", "4m x 1m", "5 por 3"
  if (!lengthM || !heightM) {
    const dimMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros?|mts?)?\s*(?:[xX*×]|por)\s*(\d+(?:[.,]\d+)?)\s*(?:m|metros?|mts?)?/);
    if (dimMatch) {
      if (!lengthM) lengthM = parseFloat(dimMatch[1].replace(',', '.'));
      if (!heightM) heightM = parseFloat(dimMatch[2].replace(',', '.'));
    }
  }

  // 3. Fallback for any standalone meter mentions if still missing
  if (!lengthM) {
    const anyM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros?|mts?)\b/);
    if (anyM) lengthM = parseFloat(anyM[1].replace(',', '.'));
  }

  // Extract quantity
  let quantity = 1;
  const qMatch = clean.match(/(\d+)\s*(?:unidades|piezas|barandas|mesas|divisores|paquetes|u\b)/i) || clean.match(/(?:necesito|preciso|cotizar)\s*(\d+)/i);
  if (qMatch) {
    quantity = parseInt(qMatch[1], 10) || 1;
  }

  // Extract material & finish
  let material = 'Caño estructural y acero SAE 1010';
  if (clean.includes('inoxidable') || clean.includes('inox')) material = 'Acero Inoxidable 304';
  else if (clean.includes('corten')) material = 'Acero Corten';
  else if (clean.includes('aluminio')) material = 'Aluminio';

  let finish = 'Pintura anticorrosiva y esmalte poliuretánico';
  if (clean.includes('electrostatica') || clean.includes('electrostática') || clean.includes('al horno')) {
    finish = 'Pintura electrostática en polvo horneada';
  } else if (clean.includes('galvanizado')) {
    finish = 'Galvanizado por inmersión en caliente';
  } else if (clean.includes('negro') || clean.includes('mate')) {
    finish = 'Esmalte negro semi-mate de alta resistencia';
  }

  const missing = [];
  if (!lengthM) missing.push('Largo o ancho total de la pieza');
  if (!heightM && suggestedTemplate !== 'MESA_CIRCULAR_001') missing.push('Altura total deseada');
  if (!clean.includes('pintura') && !clean.includes('color') && !clean.includes('terminaci')) missing.push('Color o tipo de terminación');

  return {
    detected_items: [
      {
        product_type: productType,
        quantity: Math.max(1, quantity),
        material,
        dimensions: {
          length_m: lengthM || 2.5,
          height_m: heightM || (suggestedTemplate === 'OXI_RAILING_R01' ? 1.0 : suggestedTemplate === 'OXI_PERGOLA_P01' ? 2.6 : 2.0)
        },
        finish,
        suggested_template: suggestedTemplate,
        assumptions: 'Variables deducidas por el motor de análisis OXI OS según normativa técnica estándar.'
      }
    ],
    global_notes: 'Extracción técnica generada para costeo directo paramétrico en OXI Quote.',
    missing_critical_info: missing
  };
}

export async function parseConstructionRequirement(text) {
  if (!process.env.GEMINI_API_KEY) {
    return heuristicParseRequirement(text);
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  const prompt = `Eres un ingeniero cotizador experto en la plataforma OXI OS. 
Tu trabajo es leer el siguiente requerimiento desestructurado de un arquitecto o constructora, 
identificar qué productos o estructuras de hierro/madera/vidrio necesitan, y extraer las 
variables paramétricas (largo, alto, cantidad, terminación y plantilla de costeo sugerida).

PLANTILLAS DISPONIBLES EN EL SISTEMA:
- "OXI_RAILING_R01": para barandas de balcón, pasamanos de escalera o terrazas.
- "OXI_PERGOLA_P01": para pérgolas metálicas, aleros o galerías exteriores.
- "OXI_DIVIDER_D01": para divisores de ambientes, mamparas, cerramientos tipo loft o marcos.
- "MESA_CIRCULAR_001": para mesas circulares o mobiliario cilíndrico.
- "CUSTOM": si no encaja en ninguna de las anteriores.

Extrae toda la información posible. Si falta un dato crítico (por ejemplo, piden una baranda pero no dicen cuántos metros o altura),
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
            product_type: { type: SchemaType.STRING, description: "Tipo de producto. Ej: Baranda, Pérgola, Divisor, etc." },
            quantity: { type: SchemaType.INTEGER, description: "Cantidad solicitada del producto. Si no se especifica, asume 1." },
            material: { type: SchemaType.STRING, description: "Material principal mencionado. Ej: Hierro negro, Aluminio, Vidrio repartido." },
            dimensions: {
              type: SchemaType.OBJECT,
              properties: {
                length_m: { type: SchemaType.NUMBER, description: "Largo o ancho total en metros." },
                height_m: { type: SchemaType.NUMBER, description: "Altura total en metros." }
              }
            },
            finish: { type: SchemaType.STRING, description: "Terminación o pintura. Ej: Pintura electrostática negra." },
            suggested_template: { type: SchemaType.STRING, description: "Código de plantilla: OXI_RAILING_R01, OXI_PERGOLA_P01, OXI_DIVIDER_D01, MESA_CIRCULAR_001 o CUSTOM." },
            assumptions: { type: SchemaType.STRING, description: "Cualquier suposición lógica que hiciste al leer el texto." }
          },
          required: ["product_type", "quantity"]
        }
      },
      global_notes: { type: SchemaType.STRING, description: "Notas generales sobre el proyecto o las condiciones de entrega/instalación." },
      missing_critical_info: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Lista de preguntas o datos que el cliente olvidó mencionar y son necesarios para cotizar."
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

    const parsed = JSON.parse(result.response.text());
    if (!parsed.detected_items || parsed.detected_items.length === 0) {
      return heuristicParseRequirement(text);
    }
    return parsed;
  } catch (error) {
    console.warn("Fallo en Gemini AI, utilizando extractor heurístico de respaldo:", error.message);
    return heuristicParseRequirement(text);
  }
}
