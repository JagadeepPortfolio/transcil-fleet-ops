-- Generated due_date: deploy_date + weeks*7, auto-recalculates when weeks
-- changes via EXTENSION events.
ALTER TABLE deployments
  ADD COLUMN due_date date
  GENERATED ALWAYS AS (deploy_date + (weeks * 7)) STORED;

-- ============================================================================
-- Read indexes (soft-delete aware)
-- ============================================================================
CREATE INDEX deployments_status_due_date_idx
  ON deployments(status, due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX deployments_hub_id_idx
  ON deployments(hub_id)
  WHERE deleted_at IS NULL;

CREATE INDEX deployments_rider_id_idx
  ON deployments(rider_id)
  WHERE deleted_at IS NULL;

CREATE INDEX deployments_vehicle_id_idx
  ON deployments(vehicle_id)
  WHERE deleted_at IS NULL;

CREATE INDEX riders_phone_idx
  ON riders(phone)
  WHERE deleted_at IS NULL;

CREATE INDEX riders_legacy_rider_id_idx
  ON riders(legacy_rider_id)
  WHERE deleted_at IS NULL AND legacy_rider_id IS NOT NULL;

-- ============================================================================
-- Concurrency guards: partial UNIQUE indexes.
--
-- At most one ACTIVE deployment per vehicle, and at most one per rider.
-- Two Server Actions racing to deploy the same vehicle -> one wins,
-- the other gets a constraint violation the form surfaces as
-- "vehicle no longer available, refresh".
--
-- These indexes ARE the single source of truth for vehicle availability.
-- Do not add a vehicles.status column.
-- ============================================================================
CREATE UNIQUE INDEX deployments_active_vehicle_uniq
  ON deployments(vehicle_id)
  WHERE status = 'ACTIVE' AND deleted_at IS NULL;

CREATE UNIQUE INDEX deployments_active_rider_uniq
  ON deployments(rider_id)
  WHERE status = 'ACTIVE' AND deleted_at IS NULL;
