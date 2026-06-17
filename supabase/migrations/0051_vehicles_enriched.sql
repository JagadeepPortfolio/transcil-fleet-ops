-- Unified, DERIVED vehicle status (invariant #2: derive, never store).
--
-- effective_status rolls up the whole lifecycle from the canonical sources —
-- deployments (In Use / Locked), open repairs (Under Repair), and the manual
-- service_status (In Factory / Available) — with this priority:
--   In Use  >  Locked  >  Under Repair  >  In Factory  >  Available
-- Only 'Available' is deployable. This also fixes the prior gap where a LOCKED
-- deployment left the vehicle looking Available.

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
  SELECT r.id
  FROM vehicle_repairs r
  WHERE r.vehicle_id = v.id AND r.deleted_at IS NULL AND r.status NOT IN ('COMPLETED','CANCELLED')
  ORDER BY r.reported_at DESC
  LIMIT 1
) rep ON true
WHERE v.deleted_at IS NULL;

GRANT SELECT ON vehicles_enriched TO authenticated;
