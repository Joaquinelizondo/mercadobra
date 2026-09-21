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

import { generateConstructionProposal } from './aiProposalService.js';

export const generateProposal = async (req, res) => {
  try {
    const { quoteData } = req.body;
    
    if (!quoteData || !quoteData.description) {
      return res.status(400).json({ error: 'Faltan datos de la cotización para redactar la propuesta.' });
    }

    const proposalText = await generateConstructionProposal(quoteData);
    
    res.json({
      success: true,
      text: proposalText
    });
  } catch (error) {
    console.error('Error en generateProposal:', error);
    res.status(500).json({ error: error.message || 'Error interno procesando con IA.' });
  }
};

import { auditQuoteBreakdown } from './aiAuditorService.js';

export const auditQuote = async (req, res) => {
  try {
    const { breakdownData } = req.body;
    
    if (!breakdownData) {
      return res.status(400).json({ error: 'Faltan datos del desglose para auditar.' });
    }

    const auditResult = await auditQuoteBreakdown(breakdownData);
    
    res.json({
      success: true,
      audit: auditResult
    });
  } catch (error) {
    console.error('Error en auditQuote:', error);
    res.status(500).json({ error: error.message || 'Error interno procesando auditoría con IA.' });
  }
};
