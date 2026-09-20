import { parseConstructionRequirement } from './aiService.js';

export const parseRequest = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'El texto del requerimiento no puede estar vacío.' });
    }

    const parsedData = await parseConstructionRequirement(text);
    
    res.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error('Error en parseRequest:', error);
    res.status(500).json({ error: error.message || 'Error interno procesando con IA.' });
  }
};
