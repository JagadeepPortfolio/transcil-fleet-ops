-- Add payment_mode column to activity_log for tracking how payments are made
ALTER TABLE activity_log
  ADD COLUMN payment_mode text
  CHECK (payment_mode IN ('UPI', 'Bank Transfer', 'Cash'));

COMMENT ON COLUMN activity_log.payment_mode IS
  'How the payment was made: UPI, Bank Transfer, or Cash. Applies to PAYMENT, DEPOSIT, DEPOSIT_REFUND events.';
