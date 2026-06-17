-- Make "Under Repair" always produce a repair ticket.
--
-- Until now a vehicle_repairs ticket was only created by the return flow
-- (reason = "Vehicle issue"). Vehicles set to service_status='Under Repair'
-- manually (admin edit) had no ticket, so they never appeared on the Repairs
-- screen. This trigger creates a REPORTED ticket whenever a vehicle becomes
-- "Under Repair" and has no open repair — unifying both paths.
--
-- Loop-safe with 0048 (which sets service_status FROM repair status): the
-- "no open repair" guard prevents re-creation when 0048 re-touches the vehicle.
-- No reverse sync — manually setting a vehicle back to Available does NOT close
-- an open ticket (finish via "Mark complete" on the repair).

CREATE OR REPLACE FUNCTION create_repair_on_under_repair()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.service_status = 'Under Repair'
     AND NEW.hub_id IS NOT NULL
     AND NEW.deleted_at IS NULL
     AND (TG_OP = 'INSERT' OR OLD.service_status IS DISTINCT FROM NEW.service_status)
     AND NOT EXISTS (
       SELECT 1 FROM vehicle_repairs r
       WHERE r.vehicle_id = NEW.id
         AND r.status NOT IN ('COMPLETED','CANCELLED')
         AND r.deleted_at IS NULL
     )
  THEN
    INSERT INTO vehicle_repairs (hub_id, vehicle_id, status, issue_details, reported_by)
    VALUES (NEW.hub_id, NEW.id, 'REPORTED', 'Vehicle marked Under Repair', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicles_create_repair_on_under_repair
  AFTER INSERT OR UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION create_repair_on_under_repair();

-- Backfill: open a ticket for every vehicle already Under Repair without one.
INSERT INTO vehicle_repairs (hub_id, vehicle_id, status, issue_details)
SELECT v.hub_id, v.id, 'REPORTED', 'Vehicle marked Under Repair (backfilled)'
FROM vehicles v
WHERE v.service_status = 'Under Repair'
  AND v.deleted_at IS NULL
  AND v.hub_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_repairs r
    WHERE r.vehicle_id = v.id
      AND r.status NOT IN ('COMPLETED','CANCELLED')
      AND r.deleted_at IS NULL
  );
