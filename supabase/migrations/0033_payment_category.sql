-- Categorize payments (Billing Cycle vs Late fee). Late-fee payments are tracked
-- in the timeline but must NOT reduce the rent balance, so deployment_totals'
-- rent sum excludes them. Existing/null rows count as rent (Billing Cycle).

ALTER TABLE activity_log ADD COLUMN payment_category text
  CHECK (payment_category IS NULL OR payment_category IN ('Billing Cycle', 'Late fee'));

CREATE OR REPLACE VIEW deployment_totals AS
SELECT
  d.id AS deployment_id,
  (d.weeks * d.rate_inr)
    + CASE WHEN d.new_deposit_needed THEN COALESCE(d.deposit_required_inr, 0) ELSE 0 END
    AS total_due,
  COALESCE(p.total_paid, 0) AS total_paid,
  COALESCE(dep.deposit_collected, 0) AS deposit_collected,
  COALESCE(dep.deposit_refunded,  0) AS deposit_refunded,
  (COALESCE(dep.deposit_collected, 0) - COALESCE(dep.deposit_refunded, 0)) AS deposit_net
FROM deployments d
LEFT JOIN LATERAL (
  SELECT SUM(amount_inr) AS total_paid
  FROM activity_log a
  WHERE a.deployment_id = d.id
    AND a.event_type = 'PAYMENT'
    AND a.transaction_id IS NOT NULL
    AND a.payment_category IS DISTINCT FROM 'Late fee'   -- rent only; exclude late-fee
    AND a.deleted_at IS NULL
) p ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(CASE WHEN event_type = 'DEPOSIT'        THEN amount_inr ELSE 0 END) AS deposit_collected,
    SUM(CASE WHEN event_type = 'DEPOSIT_REFUND' THEN amount_inr ELSE 0 END) AS deposit_refunded
  FROM activity_log a
  WHERE a.deployment_id = d.id
    AND a.event_type IN ('DEPOSIT','DEPOSIT_REFUND')
    AND a.transaction_id IS NOT NULL
    AND a.deleted_at IS NULL
) dep ON true
WHERE d.deleted_at IS NULL;
