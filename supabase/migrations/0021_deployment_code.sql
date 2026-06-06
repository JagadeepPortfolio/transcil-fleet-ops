-- Human-readable sequential deployment code: DEP-<year>-<n>, e.g. DEP-2026-1.
-- Year is taken from deploy_date and the sequence resets each year. Generated
-- by a BEFORE INSERT trigger so it's assigned on successful create only and is
-- gap-free (a rolled-back insert rolls back the counter increment too).

ALTER TABLE deployments ADD COLUMN deployment_code text;

-- One counter row per year. Internal table — RLS on with no policies; only the
-- SECURITY DEFINER functions below touch it.
CREATE TABLE deployment_code_counters (
  year     int PRIMARY KEY,
  last_seq int NOT NULL DEFAULT 0
);
ALTER TABLE deployment_code_counters ENABLE ROW LEVEL SECURITY;

-- Assigns the next code for the deploy_date's year. SECURITY DEFINER so the
-- inserting (RLS-restricted) user can still bump the counter.
CREATE FUNCTION assign_deployment_code() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yr  int;
  seq int;
BEGIN
  -- Respect an explicitly provided code (e.g. data import).
  IF NEW.deployment_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  yr := EXTRACT(YEAR FROM NEW.deploy_date)::int;

  INSERT INTO deployment_code_counters AS c (year, last_seq)
    VALUES (yr, 1)
    ON CONFLICT (year) DO UPDATE SET last_seq = c.last_seq + 1
    RETURNING c.last_seq INTO seq;

  NEW.deployment_code := 'DEP-' || yr || '-' || seq;
  RETURN NEW;
END $$;

CREATE TRIGGER deployments_assign_code
  BEFORE INSERT ON deployments
  FOR EACH ROW EXECUTE FUNCTION assign_deployment_code();

-- Backfill existing deployments: number per deploy_date year by created_at.
WITH numbered AS (
  SELECT
    id,
    EXTRACT(YEAR FROM deploy_date)::int AS yr,
    row_number() OVER (
      PARTITION BY EXTRACT(YEAR FROM deploy_date)
      ORDER BY created_at, id
    ) AS seq
  FROM deployments
  WHERE deployment_code IS NULL
)
UPDATE deployments d
SET deployment_code = 'DEP-' || n.yr || '-' || n.seq
FROM numbered n
WHERE d.id = n.id;

-- Seed the counters to the highest sequence used per year so new inserts
-- continue from there instead of colliding.
INSERT INTO deployment_code_counters (year, last_seq)
SELECT EXTRACT(YEAR FROM deploy_date)::int AS yr, COUNT(*)::int
FROM deployments
GROUP BY 1
ON CONFLICT (year) DO UPDATE SET last_seq = EXCLUDED.last_seq;

CREATE UNIQUE INDEX deployments_code_uniq
  ON deployments(deployment_code)
  WHERE deployment_code IS NOT NULL;

-- Recreate the enriched view so d.* re-expands to include deployment_code
-- (Postgres froze the column list at the view's original creation in 0007).
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

-- Testing helper: clear the counters so numbering restarts at 1 per year.
-- Run AFTER wiping deployments (e.g. TRUNCATE deployments CASCADE), otherwise
-- new codes would collide with existing rows. Not callable by app users.
CREATE FUNCTION reset_deployment_codes() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM deployment_code_counters;
$$;
REVOKE EXECUTE ON FUNCTION reset_deployment_codes() FROM PUBLIC;
