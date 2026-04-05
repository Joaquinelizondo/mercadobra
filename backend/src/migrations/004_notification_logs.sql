CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_logs_order_id_idx
  ON notification_logs(order_id);
