-- CMD-settable service status for vehicles that are NOT in a deployment.
-- "In Use" stays DERIVED (an ACTIVE deployment) and is never stored here — this
-- column only distinguishes idle vehicles: Available vs Under Repair / In Factory.
-- The New Deployment picker offers only service_status='Available' (and no
-- active deployment). Writes are CMD-only (existing vehicles_update_cmd RLS).
ALTER TABLE vehicles ADD COLUMN service_status text NOT NULL DEFAULT 'Available'
  CHECK (service_status IN ('Available', 'Under Repair', 'In Factory'));
