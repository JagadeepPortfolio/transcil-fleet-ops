-- Fix: vehicle_repairs.reported_by was referenced by the 0050 trigger,
-- createRepair() and logMinorRepair() but never actually created in 0046.
-- Adding it makes those insert paths valid (manual Under-Repair, return/replace
-- with Vehicle issue, and minor repairs). Nullable; captures the reporting user
-- (created_by_name still snapshots the actor via the audit trigger).

ALTER TABLE vehicle_repairs ADD COLUMN IF NOT EXISTS reported_by uuid;
