-- Add stripe_invoice_id for subscription renewal idempotency
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_invoice_id text;
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
