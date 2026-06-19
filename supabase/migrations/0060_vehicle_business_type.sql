-- Vehicle Business Type (B2C / B2B). Default B2C — the NOT NULL DEFAULT
-- backfills every existing vehicle to B2C in one shot (no bulk UPDATE needed).

ALTER TABLE vehicles
  ADD COLUMN business_type text NOT NULL DEFAULT 'B2C'
  CHECK (business_type IN ('B2C','B2B'));

-- vehicles_enriched uses v.* (frozen at view-creation), so a new vehicle column
-- doesn't appear and CREATE OR REPLACE can't reorder columns → drop + recreate.
DROP VIEW vehicles_enriched;
CREATE VIEW vehicles_enriched AS
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

GRANT SELECT ON vehicles_enriched TO authenticated;
