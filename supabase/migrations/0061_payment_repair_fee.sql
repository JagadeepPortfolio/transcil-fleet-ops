-- Add "Repair Fee" as a payment category. Like "Late fee", it's extra revenue:
-- it must NOT reduce the rent balance (total_paid), but IS part of total cash
-- collected. Mirrors the Late-fee isolation (invariant #5).

ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_payment_category_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_payment_category_check
  CHECK (payment_category IS NULL OR payment_category IN ('Billing Cycle', 'Late fee', 'Repair Fee'));

CREATE OR REPLACE VIEW deployment_totals AS
SELECT
  d.id AS deployment_id,
  (d.weeks * d.rate_inr)
    + CASE WHEN d.new_deposit_needed THEN COALESCE(d.deposit_required_inr, 0) ELSE 0 END
    AS total_due,
  COALESCE(p.total_paid, 0) AS total_paid,
  COALESCE(dep.deposit_collected, 0) AS deposit_collected,
  COALESCE(dep.deposit_refunded,  0) AS deposit_refunded,
  (COALESCE(dep.deposit_collected, 0) - COALESCE(dep.deposit_refunded, 0)) AS deposit_net,
  COALESCE(lf.late_fee_collected, 0) AS late_fee_collected,
  COALESCE(rf.repair_fee_collected, 0) AS repair_fee_collected
FROM deployments d
LEFT JOIN LATERAL (
  SELECT SUM(amount_inr) AS total_paid
  FROM activity_log a
  WHERE a.deployment_id = d.id
    AND a.event_type = 'PAYMENT'
    AND a.transaction_id IS NOT NULL
    -- rent only: exclude late-fee AND repair-fee. IS DISTINCT FROM keeps NULL
    -- (legacy / Billing Cycle) counted as rent.
    AND a.payment_category IS DISTINCT FROM 'Late fee'
    AND a.payment_category IS DISTINCT FROM 'Repair Fee'
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
LEFT JOIN LATERAL (
  SELECT SUM(amount_inr) AS late_fee_collected
  FROM activity_log a
  WHERE a.deployment_id = d.id
    AND a.event_type = 'PAYMENT'
    AND a.payment_category = 'Late fee'
    AND a.transaction_id IS NOT NULL
    AND a.deleted_at IS NULL
) lf ON true
LEFT JOIN LATERAL (
  SELECT SUM(amount_inr) AS repair_fee_collected
  FROM activity_log a
  WHERE a.deployment_id = d.id
    AND a.event_type = 'PAYMENT'
    AND a.payment_category = 'Repair Fee'
    AND a.transaction_id IS NOT NULL
    AND a.deleted_at IS NULL
) rf ON true
WHERE d.deleted_at IS NULL;

DROP VIEW deployments_enriched;
CREATE VIEW deployments_enriched AS
SELECT
  d.*,
  r.name AS rider_name,
  r.phone AS rider_phone,
  r.source AS rider_source,
  v.vtd_no,
  v.vehicle_id AS vehicle_serial,
  h.name AS hub_name,
  h.code AS hub_code,
  dt.total_due,
  (COALESCE(dt.total_paid, 0) + COALESCE(dt.deposit_collected, 0)) AS total_paid,
  dt.deposit_collected,
  dt.deposit_refunded,
  dt.deposit_net,
  dt.late_fee_collected,
  dt.repair_fee_collected,
  (COALESCE(dt.total_paid, 0) + COALESCE(dt.deposit_collected, 0)
    + COALESCE(dt.late_fee_collected, 0) + COALESCE(dt.repair_fee_collected, 0)) AS total_collected,
  (dt.total_due - COALESCE(dt.total_paid, 0) - COALESCE(dt.deposit_collected, 0)) AS balance,
  CASE
    WHEN dt.total_due IS NULL THEN NULL
    WHEN (dt.total_due - COALESCE(dt.total_paid, 0) - COALESCE(dt.deposit_collected, 0)) <= 0 THEN 'PAID'::pay_status
    WHEN (COALESCE(dt.total_paid, 0) + COALESCE(dt.deposit_collected, 0)) > 0 THEN 'PARTIAL'::pay_status
    WHEN d.billing_exempt THEN 'PENDING'::pay_status
    WHEN (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date > d.due_date THEN 'OVERDUE'::pay_status
    ELSE 'PENDING'::pay_status
  END AS pay_status,
  CASE
    WHEN d.status NOT IN ('ACTIVE', 'LOCKED') THEN NULL
    WHEN d.billing_exempt THEN NULL
    ELSE (d.due_date - (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date)
  END AS days_left,
  CASE
    WHEN d.status <> 'ACTIVE' THEN NULL
    WHEN d.billing_exempt THEN 'OK'::action_priority
    WHEN d.due_date IS NULL THEN NULL
    WHEN (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date  > d.due_date THEN 'LOCK_NOW'::action_priority
    WHEN (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date  = d.due_date THEN 'AT_RISK'::action_priority
    WHEN d.weeks > 1 AND
         (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date >= d.due_date - 3 THEN 'CALL_TODAY'::action_priority
    WHEN d.weeks > 1 AND
         (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date >= d.due_date - 5 THEN 'UPCOMING'::action_priority
    ELSE 'OK'::action_priority
  END AS action
FROM deployments d
LEFT JOIN riders   r  ON r.id = d.rider_id   AND r.deleted_at IS NULL
LEFT JOIN vehicles v  ON v.id = d.vehicle_id AND v.deleted_at IS NULL
LEFT JOIN hubs     h  ON h.id = d.hub_id
LEFT JOIN deployment_totals dt ON dt.deployment_id = d.id
WHERE d.deleted_at IS NULL;
