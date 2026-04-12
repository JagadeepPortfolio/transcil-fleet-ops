-- ============================================================================
-- deployment_totals
-- Per-deployment money aggregates from activity_log.
-- No TODAY() dependency, safely cacheable.
-- Only events with a transaction_id count toward totals (see 0005 comment).
-- ============================================================================
CREATE VIEW deployment_totals AS
SELECT
  d.id AS deployment_id,
  -- Contract total due
  (d.weeks * d.rate_inr)
    + CASE WHEN d.new_deposit_needed THEN COALESCE(d.deposit_required_inr, 0) ELSE 0 END
    AS total_due,
  -- Rent collected
  COALESCE(p.total_paid, 0) AS total_paid,
  -- Deposit movements (raw)
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

-- ============================================================================
-- deployments_enriched
-- The view the UI reads off. Joins rider/vehicle/hub + computed columns:
-- pay_status, days_left, action badge.
--
-- IST handling is EXPLICIT: CURRENT_DATE alone flips at 05:30 IST which
-- would false-alarm the night shift. Always use (CURRENT_DATE AT TIME ZONE
-- 'Asia/Kolkata')::date.
-- ============================================================================
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
  dt.total_paid,
  dt.deposit_collected,
  dt.deposit_refunded,
  dt.deposit_net,
  (dt.total_due - dt.total_paid) AS balance,
  CASE
    WHEN dt.total_due IS NULL THEN NULL
    WHEN (dt.total_due - dt.total_paid) <= 0 THEN 'PAID'::pay_status
    WHEN dt.total_paid > 0 THEN 'PARTIAL'::pay_status
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
