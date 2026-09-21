import { getRepository } from './repository.js';

export const getAnalyticsMetrics = async (req, res) => {
  try {
    const repo = await getRepository();
    const quotes = await repo.getAllCustomerQuotes();
    
    // Process quotes for dashboard
    let totalVolumeUsd = 0;
    let totalVolumeUyu = 0;
    
    const statusCounts = {
      in_progress: 0,
      sent: 0,
      accepted: 0,
      project_in_progress: 0,
      completed: 0,
      cancelled: 0
    };

    // For chart: quotes by month
    const quotesByMonth = {};

    quotes.forEach(q => {
      // Counts
      statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
      
      // Volumes (only accepted or completed for real revenue, but let's calculate pipeline too)
      if (['accepted', 'project_in_progress', 'completed'].includes(q.status)) {
        if (q.currency === 'USD') totalVolumeUsd += Number(q.totalAmount || 0);
        if (q.currency === 'UYU') totalVolumeUyu += Number(q.totalAmount || 0);
      }
      
      // Chart grouping
      const date = new Date(q.createdAt || q.created_at);
      if (!isNaN(date)) {
        const monthYear = date.toISOString().substring(0, 7); // "YYYY-MM"
        if (!quotesByMonth[monthYear]) {
          quotesByMonth[monthYear] = { name: monthYear, Totales: 0, Aceptadas: 0 };
        }
        quotesByMonth[monthYear].Totales += 1;
        if (['accepted', 'project_in_progress', 'completed'].includes(q.status)) {
          quotesByMonth[monthYear].Aceptadas += 1;
        }
      }
    });

    const chartData = Object.values(quotesByMonth).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      metrics: {
        totalQuotes: quotes.length,
        statusCounts,
        revenue: { USD: totalVolumeUsd, UYU: totalVolumeUyu },
        chartData
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Error procesando analíticas.' });
  }
};
