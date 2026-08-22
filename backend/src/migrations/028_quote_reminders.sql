CREATE TABLE IF NOT EXISTS customer_quote_reminders (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT NOT NULL REFERENCES customer_quotes(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  CONSTRAINT customer_quote_reminders_type_check CHECK (reminder_type IN ('client_day_7', 'admin_day_14')),
  CONSTRAINT customer_quote_reminders_status_check CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT customer_quote_reminders_unique UNIQUE (quote_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS customer_quote_reminders_quote_idx
  ON customer_quote_reminders(quote_id);

-- Activar la automatización sin enviar recordatorios retroactivos a clientes
-- cuyas cotizaciones ya estaban vencidas antes de este despliegue.
INSERT INTO customer_quote_reminders (quote_id, reminder_type, status, attempted_at, sent_at)
SELECT id, 'client_day_7', 'sent', NOW(), NOW()
FROM customer_quotes
WHERE status = 'sent' AND sent_at <= NOW() - INTERVAL '7 days'
ON CONFLICT (quote_id, reminder_type) DO NOTHING;

INSERT INTO customer_quote_reminders (quote_id, reminder_type, status, attempted_at, sent_at)
SELECT id, 'admin_day_14', 'sent', NOW(), NOW()
FROM customer_quotes
WHERE status = 'sent' AND sent_at <= NOW() - INTERVAL '14 days'
ON CONFLICT (quote_id, reminder_type) DO NOTHING;
