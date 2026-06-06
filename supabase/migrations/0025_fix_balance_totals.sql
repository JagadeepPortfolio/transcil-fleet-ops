-- Fix balance/totals: the deposit is part of total_due (rent + deposit_required)
-- but the deposit COLLECTED was never credited, so balance never cleared.
-- Now: total_paid = rent paid + deposit collected; balance subtracts both;
-- pay_status uses the same combined figure. deployment_totals is unchanged —
-- we fold rent + deposit only in this view.

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
