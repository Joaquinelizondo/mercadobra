/**
 * constructionRegionalProfiles.js
 *
 * Motor de Configuración y Escalabilidad Multi-País para Oxi Pro Suite.
 * Desacopla las regulaciones laborales, monedas, alícuotas y feriados
 * para que el producto sea 100% exportable y configurable por país.
 */

export const REGIONAL_PROFILES = {
  UY: {
    code: 'UY',
    countryName: 'Uruguay',
    flag: '🇺🇾',
    currency: 'UYU',
    currencySymbol: '$',
    laborAgreement: 'SUNCA Grupo 9 (Industria de la Construcción)',
    socialSecurityBody: 'BPS (Banco de Previsión Social)',
    laborInsurance: 'BSE (Banco de Seguros del Estado)',
    defaultSocialLawsRate: 60,
    categories: [
      { id: 'capataz', role: 'Capataz General', categoryCode: 'Cat. X', dailyRate: 4200, socialLawsRate: 60 },
      { id: 'oficial_esp', role: 'Oficial Especializado', categoryCode: 'Cat. V', dailyRate: 3400, socialLawsRate: 60 },
      { id: 'oficial', role: 'Oficial', categoryCode: 'Cat. IV', dailyRate: 2800, socialLawsRate: 60 },
      { id: 'medio_oficial', role: 'Medio Oficial', categoryCode: 'Cat. III', dailyRate: 2200, socialLawsRate: 60 },
      { id: 'peon_comun', role: 'Peón Común', categoryCode: 'Cat. II', dailyRate: 1950, socialLawsRate: 60 },
      { id: 'peon_practico', role: 'Peón Práctico', categoryCode: 'Cat. I', dailyRate: 1800, socialLawsRate: 60 }
    ],
    specialConstructionHoliday: '3er lunes de octubre (Día de la Construcción - Ley 19.292)'
  },
  AR: {
    code: 'AR',
    countryName: 'Argentina',
    flag: '🇦🇷',
    currency: 'ARS',
    currencySymbol: '$',
    laborAgreement: 'UOCRA (CCT 76/75)',
    socialSecurityBody: 'AFIP / ANSES / FOCRA',
    laborInsurance: 'ART (Riesgos del Trabajo)',
    defaultSocialLawsRate: 65,
    categories: [
      { id: 'capataz', role: 'Capataz de Obra', categoryCode: 'Capataz', dailyRate: 45000, socialLawsRate: 65 },
      { id: 'oficial_esp', role: 'Oficial Especializado', categoryCode: 'Of. Esp.', dailyRate: 38000, socialLawsRate: 65 },
      { id: 'oficial', role: 'Oficial Albañil', categoryCode: 'Oficial', dailyRate: 32000, socialLawsRate: 65 },
      { id: 'medio_oficial', role: 'Medio Oficial', categoryCode: 'Medio Of.', dailyRate: 26000, socialLawsRate: 65 },
      { id: 'ayudante', role: 'Ayudante', categoryCode: 'Ayudante', dailyRate: 22000, socialLawsRate: 65 }
    ],
    specialConstructionHoliday: '22 de Abril (Día de los Obreros de la Construcción)'
  },
  CL: {
    code: 'CL',
    countryName: 'Chile',
    flag: '🇨🇱',
    currency: 'CLP',
    currencySymbol: '$',
    laborAgreement: 'CChC / Código del Trabajo',
    socialSecurityBody: 'Previsión Social (AFP, Fonasa/Isapre, AFC)',
    laborInsurance: 'Mutual de Seguridad CChC / ACHS',
    defaultSocialLawsRate: 35,
    categories: [
      { id: 'jefe_obra', role: 'Jefe de Obra / Capataz', categoryCode: 'Capataz', dailyRate: 60000, socialLawsRate: 35 },
      { id: 'maestro_mayor', role: 'Maestro Mayor', categoryCode: 'M. Mayor', dailyRate: 50000, socialLawsRate: 35 },
      { id: 'maestro_primera', role: 'Maestro Primera', categoryCode: 'M. Primera', dailyRate: 42000, socialLawsRate: 35 },
      { id: 'maestro_segunda', role: 'Maestro Segunda', categoryCode: 'M. Segunda', dailyRate: 34000, socialLawsRate: 35 },
      { id: 'jornal', role: 'Jornalero', categoryCode: 'Jornal', dailyRate: 26000, socialLawsRate: 35 }
    ],
    specialConstructionHoliday: '19 de Marzo (Día del Trabajador de la Construcción)'
  },
  INT: {
    code: 'INT',
    countryName: 'Internacional / Dólares',
    flag: '🌐',
    currency: 'USD',
    currencySymbol: 'US$',
    laborAgreement: 'Estándar Internacional (Configurable)',
    socialSecurityBody: 'Seguridad Social Local',
    laborInsurance: 'Seguro de Responsabilidad y Accidentes',
    defaultSocialLawsRate: 50,
    categories: [
      { id: 'supervisor', role: 'Site Supervisor / Foreman', categoryCode: 'Sup.', dailyRate: 150, socialLawsRate: 50 },
      { id: 'lead_craft', role: 'Lead Craftsman', categoryCode: 'Lead', dailyRate: 120, socialLawsRate: 50 },
      { id: 'journeyman', role: 'Journeyman / Craftsman', categoryCode: 'Journ.', dailyRate: 95, socialLawsRate: 50 },
      { id: 'apprentice', role: 'Apprentice / Helper', categoryCode: 'Appr.', dailyRate: 70, socialLawsRate: 50 },
      { id: 'laborer', role: 'General Laborer', categoryCode: 'Labor', dailyRate: 55, socialLawsRate: 50 }
    ],
    specialConstructionHoliday: '1 de Mayo (Día Internacional de los Trabajadores)'
  }
}

/**
 * Obtiene el perfil regional por código de país (con fallback a Uruguay UY)
 */
export function getRegionalProfile(countryCode = 'UY') {
  const code = String(countryCode || '').toUpperCase()
  return REGIONAL_PROFILES[code] || REGIONAL_PROFILES.UY
}

/**
 * Formatea un monto respetando el perfil regional y su moneda
 */
export function formatRegionalMoney(amount, countryCode = 'UY') {
  const profile = getRegionalProfile(countryCode)
  const num = Number(amount || 0)

  if (profile.currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num)
  }

  if (profile.currency === 'ARS') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(num)
  }

  if (profile.currency === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(num)
  }

  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 0
  }).format(num)
}

