-- Wire IN_FACTORY into the two status-derivation points.
--
-- 1) sync trigger: IN_FACTORY repair → vehicle service_status 'In Factory'
--    (still an OPEN repair; only flips when there's no active deployment).
-- 2) vehicles_enriched: an open repair that is IN_FACTORY rolls up to
--    effective_status 'In Factory' (not 'Under Repair'), keeping the derived
--    status consistent with service_status.

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
    ELSIF NEW.status = 'IN_FACTORY' THEN
      IF NOT has_active_deployment THEN
        UPDATE vehicles SET service_status = 'In Factory' WHERE id = NEW.vehicle_id;
      END IF;
    ELSE
      -- other open / in-progress states
      IF NOT has_active_deployment THEN
        UPDATE vehicles SET service_status = 'Under Repair' WHERE id = NEW.vehicle_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE VIEW vehicles_enriched AS
SELECT
  v.*,
  vt.name AS vehicle_type_name,
  h.name  AS hub_name,
  h.code  AS hub_code,
  dep.id     AS current_deployment_id,
  dep.status AS current_deployment_status,
  rep.id     AS open_repair_id,
  CASE
    WHEN dep.status = 'ACTIVE'             THEN 'In Use'
    WHEN dep.status = 'LOCKED'             THEN 'Locked'
    WHEN rep.status = 'IN_FACTORY'         THEN 'In Factory'
    WHEN rep.id IS NOT NULL                THEN 'Under Repair'
    WHEN v.service_status = 'Under Repair' THEN 'Under Repair'
    WHEN v.service_status = 'In Factory'   THEN 'In Factory'
    ELSE 'Available'
  END AS effective_status
FROM vehicles v
LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
LEFT JOIN hubs h ON h.id = v.hub_id
LEFT JOIN LATERAL (
  SELECT d.id, d.status
  FROM deployments d
  WHERE d.vehicle_id = v.id AND d.deleted_at IS NULL AND d.status IN ('ACTIVE','LOCKED')
  ORDER BY (d.status = 'ACTIVE') DESC, d.deploy_date DESC
  LIMIT 1
) dep ON true
LEFT JOIN LATERAL (
  SELECT r.id, r.status
  FROM vehicle_repairs r
  WHERE r.vehicle_id = v.id AND r.deleted_at IS NULL AND r.status NOT IN ('COMPLETED','CANCELLED')
  ORDER BY r.reported_at DESC
  LIMIT 1
) rep ON true
WHERE v.deleted_at IS NULL;
