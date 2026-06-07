-- "Total Collected" = all cash actually received: rent + late fee + deposit.
-- Distinct from total_paid/balance, which stay rent+deposit (late fees are extra
-- revenue, not part of the contract due, so they must not clear the balance).
--
-- 1) deployment_totals gains late_fee_collected (txn-gated, Late-fee PAYMENTs).
-- 2) deployments_enriched gains total_collected (= rent + deposit + late fee)
--    and exposes late_fee_collected. total_paid / balance / pay_status unchanged.

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
  COALESCE(lf.late_fee_collected, 0) AS late_fee_collected
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
LEFT JOIN LATERAL (
  SELECT SUM(amount_inr) AS late_fee_collected
  FROM activity_log a
  WHERE a.deployment_id = d.id
    AND a.event_type = 'PAYMENT'
    AND a.payment_category = 'Late fee'
    AND a.transaction_id IS NOT NULL
    AND a.deleted_at IS NULL
) lf ON true
WHERE d.deleted_at IS NULL;

DROP VIEW deployments_enriched;
CREATE VIEW deployments_enriched AS
SELECT
  d.*,
  r.name AS rider_name,
  r.phone AS rider_phone,
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
  (COALESCE(dt.total_paid, 0) + COALESCE(dt.deposit_collected, 0) + COALESCE(dt.late_fee_collected, 0)) AS total_collected,
  (dt.total_due - COALESCE(dt.total_paid, 0) - COALESCE(dt.deposit_collected, 0)) AS balance,
  CASE
    WHEN dt.total_due IS NULL THEN NULL
    WHEN (dt.total_due - COALESCE(dt.total_paid, 0) - COALESCE(dt.deposit_collected, 0)) <= 0 THEN 'PAID'::pay_status
    WHEN (COALESCE(dt.total_paid, 0) + COALESCE(dt.deposit_collected, 0)) > 0 THEN 'PARTIAL'::pay_status
    WHEN (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date > d.due_date THEN 'OVERDUE'::pay_status
    ELSE 'PENDING'::pay_status
  END AS pay_status,
  (d.due_date - (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date) AS days_left,
  CASE
    WHEN d.status <> 'ACTIVE' THEN NULL
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
