-- Battery type on new deployments: Fixed (no battery no.), Single (one battery
-- no.), Dual (two battery nos). Adds battery_type + a second battery number.
-- Recreate deployments_enriched so d.* re-expands to include the new columns
-- (Postgres freezes the view column list at creation; same pattern as 0031).

ALTER TABLE deployments ADD COLUMN battery_type text
  CHECK (battery_type IS NULL OR battery_type IN ('Fixed', 'Single', 'Dual'));
ALTER TABLE deployments ADD COLUMN battery_number_2 text;

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
