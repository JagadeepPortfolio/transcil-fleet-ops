-- ============================================================================
-- ACTIVITY LOG
-- Audit trail for every money/state movement on a deployment.
-- Deployment row is canonical state; this table is history.
--
-- IMPORTANT: writes MUST go through lib/db/activity-log.ts :: logActivityEvent,
-- which wraps the activity_log insert AND the corresponding deployment column
-- updates in a single transaction. Direct inserts from components are
-- forbidden (documented, not lint-enforced in v1).
--
-- No CHECK constraint on transaction_id by design: PAYMENT/DEPOSIT events can
-- be logged without a txn ID (staff is collecting it), they just don't count
-- toward Total Paid in deployments_enriched until filled. This mirrors the
-- v2.4 Excel template behaviour.
-- ============================================================================
CREATE TABLE activity_log (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id              uuid NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,

  event_type                 activity_event_type NOT NULL,
  event_date                 date NOT NULL,

  -- money
  amount_inr                 numeric(10,2) CHECK (amount_inr IS NULL OR amount_inr >= 0),
  transaction_id             text,
  additional_transaction_id  text,

  -- PAYMENT
  week_number                int,

  -- REPLACEMENT
  old_vehicle_id             uuid REFERENCES vehicles(id),
  new_vehicle_id             uuid REFERENCES vehicles(id),
  old_vtd                    text,  -- human-readable cache of VTDs at event time
  new_vtd                    text,

  -- RETURN / REPLACEMENT
  reason                     text,

  -- EXTENSION
  extra_weeks                int CHECK (extra_weeks IS NULL OR extra_weeks > 0),

  -- REMINDER_CALL
  call_outcome               text,

  notes                      text,

  -- audit
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  created_by                 uuid REFERENCES auth.users(id),
  updated_by                 uuid REFERENCES auth.users(id),
  deleted_at                 timestamptz
);

CREATE TRIGGER activity_log_updated_at BEFORE UPDATE ON activity_log
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX activity_log_deployment_event_type_idx
  ON activity_log(deployment_id, event_type)
  WHERE deleted_at IS NULL;

CREATE INDEX activity_log_deployment_event_date_idx
  ON activity_log(deployment_id, event_date DESC)
  WHERE deleted_at IS NULL;
