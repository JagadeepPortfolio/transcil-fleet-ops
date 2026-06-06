-- Payment modes are now UPI and Mobile App (Bank Transfer and Cash removed).
-- Defensive remap of any out-of-range existing values before tightening the
-- CHECK so the migration is safe even on a non-empty table.
UPDATE activity_log
SET payment_mode = 'UPI'
WHERE payment_mode IS NOT NULL
  AND payment_mode NOT IN ('UPI', 'Mobile App');

ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_payment_mode_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_payment_mode_check
  CHECK (payment_mode IN ('UPI', 'Mobile App'));

COMMENT ON COLUMN activity_log.payment_mode IS
  'How the payment was made: UPI or Mobile App. Applies to PAYMENT, DEPOSIT, DEPOSIT_REFUND events.';
