-- Generic updated_at trigger function.
-- Applied to all core tables below. updated_by is stamped by Server Actions,
-- not by a trigger (the trigger has no session-user context without extra plumbing).
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- RIDERS
-- ============================================================================
CREATE TABLE riders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_rider_id  text UNIQUE,                            -- nullable; filled by CSV import later
  name             text NOT NULL,
  phone            citext NOT NULL UNIQUE
                   CHECK (phone ~ '^[0-9]{10}$'),
  address          text,
  id_proof_url     text,
  photo_url        text,
  source           rider_source,
  location_id      int REFERENCES locations(id),
  notes            text,
  -- audit
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id),
  updated_by       uuid REFERENCES auth.users(id),
  deleted_at       timestamptz
);

CREATE TRIGGER riders_updated_at BEFORE UPDATE ON riders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- VEHICLES
-- No `status` column by design: availability is derived from
-- NOT EXISTS (deployment WHERE vehicle_id = this AND status = 'ACTIVE').
-- See 0004 partial unique index for the concurrency guard.
-- ============================================================================
CREATE TABLE vehicles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vtd_no           text NOT NULL UNIQUE,                   -- Vehicle Tracking Device serial
  vehicle_id       text,                                   -- manual serial (optional)
  vehicle_type_id  int NOT NULL REFERENCES vehicle_types(id),
  colour           text,
  -- audit
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id),
  updated_by       uuid REFERENCES auth.users(id),
  deleted_at       timestamptz
);

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- DEPLOYMENTS
-- Holds canonical contract state. Activity log is the audit trail; every
-- event insert must update the corresponding deployment columns in the same
-- transaction (see lib/db/activity-log.ts logActivityEvent helper).
-- ============================================================================
CREATE TABLE deployments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  rider_id                uuid NOT NULL REFERENCES riders(id)   ON DELETE RESTRICT,
  vehicle_id              uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  hub_id                  int  NOT NULL REFERENCES hubs(id),

  deploy_date             date NOT NULL,
  weeks                   int  NOT NULL CHECK (weeks BETWEEN 1 AND 52),
  rate_inr                numeric(10,2) NOT NULL CHECK (rate_inr >= 0),

  -- deposit contract (not cash). Cash movements live in activity_log.
  deposit_required_inr    numeric(10,2) NOT NULL DEFAULT 0
                          CHECK (deposit_required_inr >= 0),
  new_deposit_needed      boolean NOT NULL DEFAULT true,
  deposit_refund_status   deposit_refund_status NOT NULL DEFAULT 'Pending',

  status                  deployment_status NOT NULL DEFAULT 'ACTIVE',

  -- operational state
  call_status             call_status DEFAULT 'Pending',
  call_notes              text,
  lock_date               date,
  lock_status             lock_status NOT NULL DEFAULT 'Not Locked',
  return_date             date,
  return_reason           text,
  notes                   text,

  -- audit
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  created_by              uuid REFERENCES auth.users(id),
  updated_by              uuid REFERENCES auth.users(id),
  deleted_at              timestamptz
);

CREATE TRIGGER deployments_updated_at BEFORE UPDATE ON deployments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
