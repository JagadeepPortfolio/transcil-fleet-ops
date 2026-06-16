-- Vehicle-repair subsystem: wiring fixes discovered during UI build.
--
-- 1) service_status sync. A repair is opened/worked by hub staff (customer
--    officer, technician) who are NOT CMD — but vehicles UPDATE is CMD-only
--    (0009/0041). So the app must NOT write vehicles.service_status directly.
--    Instead this SECURITY DEFINER trigger keeps it in sync with repair status:
--      open / in-progress repair  -> 'Under Repair'
--      completed / cancelled      -> 'Available' (only when no other open repair
--                                    and no ACTIVE deployment)
--    The vehicle is never set to a deployable state while a deployment is active
--    or another repair is open (invariant #2 — service_status is for idle vehicles).
--
-- 2) Stock-write RLS. Technicians consume parts (USED movements decrement stock),
--    so stock writes must be allowed for tech staff, not just inventory managers.
--    Adding/deleting catalog parts stays manager-only (spare_parts policy).

CREATE OR REPLACE FUNCTION sync_vehicle_service_status_from_repair()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active_deployment boolean;
  has_other_open_repair boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM deployments d
    WHERE d.vehicle_id = NEW.vehicle_id AND d.status = 'ACTIVE' AND d.deleted_at IS NULL
  ) INTO has_active_deployment;

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status IN ('COMPLETED','CANCELLED') THEN
      SELECT EXISTS (
        SELECT 1 FROM vehicle_repairs r
        WHERE r.vehicle_id = NEW.vehicle_id AND r.id <> NEW.id
          AND r.status NOT IN ('COMPLETED','CANCELLED') AND r.deleted_at IS NULL
      ) INTO has_other_open_repair;

      IF NOT has_active_deployment AND NOT has_other_open_repair THEN
        UPDATE vehicles SET service_status = 'Available' WHERE id = NEW.vehicle_id;
      END IF;
    ELSE
      -- open / in-progress repair
      IF NOT has_active_deployment THEN
        UPDATE vehicles SET service_status = 'Under Repair' WHERE id = NEW.vehicle_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicle_repairs_sync_service_status
  AFTER INSERT OR UPDATE ON vehicle_repairs
  FOR EACH ROW EXECUTE FUNCTION sync_vehicle_service_status_from_repair();

-- Relax stock writes to tech staff (technicians + supervisors + CMD), hub-scoped.
DROP POLICY IF EXISTS spare_part_stock_write ON spare_part_stock;
CREATE POLICY spare_part_stock_write ON spare_part_stock
  FOR ALL TO authenticated
  USING (current_user_is_tech_staff() AND (current_user_is_cmd() OR hub_id = current_user_hub_id()))
  WITH CHECK (current_user_is_tech_staff() AND (current_user_is_cmd() OR hub_id = current_user_hub_id()));
