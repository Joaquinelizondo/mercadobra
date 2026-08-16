/**
 * Centraliza la configuración del servidor desde variables de entorno.
 * Valida también que las variables críticas estén presentes.
 */

const env = process.env

export const config = {
  // Server
  port: Number(env.PORT || 4000),
  nodeEnv: env.NODE_ENV || 'development',

  // Frontend URLs
  frontendOrigin: env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:4173',
  frontendPublicUrl: env.FRONTEND_PUBLIC_URL || 'http://localhost:5173',
  backendPublicUrl: env.BACKEND_PUBLIC_URL || `http://localhost:${Number(env.PORT || 4000)}`,

  // Database
  databaseUrl: env.DATABASE_URL || null,
  requireDatabase: String(env.REQUIRE_DATABASE || 'false').toLowerCase() === 'true',

  // OpenAI (Chat)
  openaiApiKey: env.OPENAI_API_KEY || null,
  openaiModel: env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiBaseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',

  // Mercado Pago
  mercadoPagoAccessToken: env.MERCADOPAGO_ACCESS_TOKEN || null,

  // Email - SMTP
  smtpHost: env.SMTP_HOST || null,
  smtpPort: Number(env.SMTP_PORT || 587),
  smtpUser: env.SMTP_USER || null,
  smtpPass: env.SMTP_PASS || null,
  smtpFrom: env.SMTP_FROM || null,
  emailSendTimeoutMs: Number(env.EMAIL_SEND_TIMEOUT_MS || 12000),

  // Email - Resend
  resendApiKey: env.RESEND_API_KEY || null,
  resendFrom: env.RESEND_FROM || null,

  // WhatsApp - Meta
  metaWhatsappAccessToken: env.META_WHATSAPP_ACCESS_TOKEN || null,
  metaWhatsappPhoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID || null,
  metaWhatsappApiVersion: env.META_WHATSAPP_API_VERSION || 'v22.0',

  // WhatsApp - Twilio
  twilioAccountSid: env.TWILIO_ACCOUNT_SID || null,
  twilioAuthToken: env.TWILIO_AUTH_TOKEN || null,
  twilioWhatsappFrom: env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',

  // WhatsApp - Webhook
  whatsappProvider: env.WHATSAPP_PROVIDER || 'webhook',
  whatsappWebhookUrl: env.WHATSAPP_WEBHOOK_URL || null,
  whatsappSendTimeoutMs: Number(env.WHATSAPP_SEND_TIMEOUT_MS || 12000),

  // Product media - Cloudinary
  cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME || null,
  cloudinaryApiKey: env.CLOUDINARY_API_KEY || null,
  cloudinaryApiSecret: env.CLOUDINARY_API_SECRET || null,
  cloudinaryFolder: env.CLOUDINARY_FOLDER || 'mercadobra/products',
}

/**
 * Valida las variables de entorno.
 * Lanza un error si faltan variables críticas.
 * Emite warnings para variables recomendadas pero opcionales.
 */
export function validateEnvVars() {
  const errors = []
  const warnings = []

  // Validaciones de variables CRÍTICAS
  // (En desarrollo no es crítico, pero en producción sí)
  const isProduction = config.nodeEnv === 'production'

  if (isProduction) {
    const critical = [
      {
        name: 'FRONTEND_PUBLIC_URL',
        reason: 'Necesaria para construir URLs públicas en notificaciones',
      },
      {
        name: 'BACKEND_PUBLIC_URL',
        reason: 'Necesaria para webhooks de Mercado Pago',
      },
    ]

    critical.forEach((critical) => {
      if (!env[critical.name]) {
        errors.push(`❌ ${critical.name}: obligatoria en producción. ${critical.reason}`)
      }
    })

    if (config.requireDatabase && !config.databaseUrl) {
      errors.push('❌ DATABASE_URL: obligatoria para persistencia segura en producción')
    }
  }

  // Validaciones de integraciones OPCIONALES
  const integrations = [
    {
      name: 'Mercado Pago',
      required: ['MERCADOPAGO_ACCESS_TOKEN'],
      optional: [],
    },
    {
      name: 'OpenAI Chat',
      required: ['OPENAI_API_KEY'],
      optional: ['OPENAI_MODEL', 'OPENAI_BASE_URL'],
    },
    {
      name: 'PostgreSQL',
      required: ['DATABASE_URL'],
      optional: [],
    },
    {
      name: 'Cloudinary Images',
      required: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
      optional: ['CLOUDINARY_FOLDER'],
    },
    {
      name: 'SMTP (Email)',
      required: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'],
      optional: [],
    },
    {
      name: 'Resend (Email Alternative)',
      required: ['RESEND_API_KEY', 'RESEND_FROM'],
      optional: [],
    },
    {
      name: 'WhatsApp (Meta)',
      required: ['META_WHATSAPP_ACCESS_TOKEN', 'META_WHATSAPP_PHONE_NUMBER_ID'],
      optional: ['META_WHATSAPP_API_VERSION'],
    },
    {
      name: 'WhatsApp (Webhook)',
      required: ['WHATSAPP_WEBHOOK_URL'],
      optional: [],
    },
    {
      name: 'Twilio WhatsApp',
      required: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
      optional: ['TWILIO_WHATSAPP_FROM'],
    },
  ]

  // Chequear integraciones: si tiene ALGUNO de los required, avisar si no tiene todos
  integrations.forEach((integration) => {
    const hasAtLeastOne = integration.required.some((varName) => env[varName])
    const hasMissing = integration.required.some((varName) => !env[varName])

    if (hasAtLeastOne && hasMissing) {
      warnings.push(
        `⚠️  ${integration.name}: parcialmente configurado. ` +
          `Faltan: ${integration.required.filter((v) => !env[v]).join(', ')}`
      )
    }

    if (!hasAtLeastOne) {
      warnings.push(`ℹ️  ${integration.name}: no configurado (opcional)`)
    }
  })

  // Si hay errores críticos, lanzar excepción
  if (errors.length > 0) {
    console.error('\n❌ Errores de configuración:')
    errors.forEach((msg) => console.error(`   ${msg}`))
    console.error('')
    process.exit(1)
  }

  // Si hay warnings, mostrarlos pero continuar
  if (warnings.length > 0) {
    console.warn('\n⚠️  Advertencias de configuración:')
    warnings.forEach((msg) => console.warn(`   ${msg}`))
    console.warn('')
  }

  console.log(`ℹ️  Node env: ${config.nodeEnv}`)
  console.log(`ℹ️  Backend URL: ${config.backendPublicUrl}`)
  console.log(`ℹ️  Frontend URL: ${config.frontendPublicUrl}`)
  console.log('')
}
