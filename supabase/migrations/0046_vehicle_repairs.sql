-- Vehicle-repair subsystem, part 3 of 4: repairs, parts-used, timeline,
-- and factory returns.
--
--   vehicle_repairs    the repair job (canonical state + status machine)
--   repair_parts_used  parts fitted in a repair → drive USED stock movements
--   repair_events      timeline (status changes + customer-officer ↔ technician notes)
--   factory_returns    defective cores sent back to Calon (the client's
--                      "SPARES PARTS RETURN TO FACTORY" sheet) — separate from
--                      good stock, which it never touched.

CREATE TYPE repair_status AS ENUM (
  'REPORTED','INVESTIGATING','IN_REPAIR','AWAITING_PARTS','COMPLETED','CANCELLED'
);

-- ── Repair job ────────────────────────────────────────────────────────────────
CREATE TABLE vehicle_repairs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id          int NOT NULL REFERENCES hubs(id),
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id),
  deployment_id   uuid REFERENCES deployments(id),   -- originating return, if any
  status          repair_status NOT NULL DEFAULT 'REPORTED',
  issue_details   text,                              -- logged by customer officer
  reported_at     timestamptz NOT NULL DEFAULT now(),
  assigned_to     uuid,                              -- technician (app_users.id)
  diagnosis       text,
  cost_estimate   numeric(10,2),                     -- rough repair-charge estimate
  cost_discount   numeric(10,2),
  repair_notes    text,
  completed_at    timestamptz,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX vehicle_repairs_vehicle_idx ON vehicle_repairs (vehicle_id);
CREATE INDEX vehicle_repairs_hub_status_idx ON vehicle_repairs (hub_id, status);
CREATE INDEX vehicle_repairs_deployment_idx ON vehicle_repairs (deployment_id);

CREATE TRIGGER vehicle_repairs_set_actor BEFORE INSERT ON vehicle_repairs
  FOR EACH ROW EXECUTE FUNCTION set_created_by_audit();
CREATE TRIGGER vehicle_repairs_set_updated BEFORE UPDATE ON vehicle_repairs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Now that vehicle_repairs exists, link the inventory ledger's USED movements.
ALTER TABLE spare_part_movements
  ADD CONSTRAINT spare_part_movements_repair_fk
  FOREIGN KEY (repair_id) REFERENCES vehicle_repairs(id);

-- ── Parts fitted in a repair ──────────────────────────────────────────────────
CREATE TABLE repair_parts_used (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id       uuid NOT NULL REFERENCES vehicle_repairs(id),
  spare_part_id   uuid NOT NULL REFERENCES spare_parts(id),
  quantity        int NOT NULL CHECK (quantity > 0),
  notes           text,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX repair_parts_used_repair_idx ON repair_parts_used (repair_id);

CREATE TRIGGER repair_parts_used_set_actor BEFORE INSERT ON repair_parts_used
  FOR EACH ROW EXECUTE FUNCTION set_created_by_audit();

-- ── Repair timeline ───────────────────────────────────────────────────────────
CREATE TABLE repair_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id       uuid NOT NULL REFERENCES vehicle_repairs(id),
  event_type      text NOT NULL,   -- CREATED | NOTE | STATUS_CHANGE | PART_USED | COMPLETED | CANCELLED
  from_status     repair_status,
  to_status       repair_status,
  note            text,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX repair_events_repair_idx ON repair_events (repair_id, created_at);

CREATE TRIGGER repair_events_set_actor BEFORE INSERT ON repair_events
  FOR EACH ROW EXECUTE FUNCTION set_created_by_audit();

-- ── Factory returns (defective cores back to Calon) ───────────────────────────
CREATE TABLE factory_returns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id           int NOT NULL REFERENCES hubs(id),
  spare_part_id    uuid REFERENCES spare_parts(id),    -- nullable: free-text fallback
  part_description text,                               -- used when not in catalog
  quantity         int NOT NULL CHECK (quantity > 0),
  repair_id        uuid REFERENCES vehicle_repairs(id),
  vehicle_id       uuid REFERENCES vehicles(id),
  reason           text,
  status           text NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','SENT','ACKNOWLEDGED')),
  event_date       date NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date,
  sent_at          timestamptz,
  notes            text,
  created_by       uuid,
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  CHECK (spare_part_id IS NOT NULL OR part_description IS NOT NULL)
);
CREATE INDEX factory_returns_hub_idx ON factory_returns (hub_id, status);
CREATE INDEX factory_returns_repair_idx ON factory_returns (repair_id);

CREATE TRIGGER factory_returns_set_actor BEFORE INSERT ON factory_returns
  FOR EACH ROW EXECUTE FUNCTION set_created_by_audit();
CREATE TRIGGER factory_returns_set_updated BEFORE UPDATE ON factory_returns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE vehicle_repairs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_parts_used  ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_returns    ENABLE ROW LEVEL SECURITY;

-- Repairs: hub-scoped. Any hub staff may create (from a return) and update
-- (officer logs the issue, technician updates diagnosis/status). CMD deletes.
CREATE POLICY vehicle_repairs_select ON vehicle_repairs
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (current_user_is_cmd() OR hub_id = current_user_hub_id()));
CREATE POLICY vehicle_repairs_insert ON vehicle_repairs
  FOR INSERT TO authenticated
  WITH CHECK (current_user_is_cmd() OR hub_id = current_user_hub_id());
CREATE POLICY vehicle_repairs_update ON vehicle_repairs
  FOR UPDATE TO authenticated
  USING (current_user_is_cmd() OR hub_id = current_user_hub_id())
  WITH CHECK (current_user_is_cmd() OR hub_id = current_user_hub_id());
CREATE POLICY vehicle_repairs_delete ON vehicle_repairs
  FOR DELETE TO authenticated USING (current_user_is_cmd());

-- Parts used: visibility inherits the repair's hub; only tech staff record parts.
CREATE POLICY repair_parts_used_select ON repair_parts_used
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM vehicle_repairs r
    WHERE r.id = repair_parts_used.repair_id
      AND (current_user_is_cmd() OR r.hub_id = current_user_hub_id())));
CREATE POLICY repair_parts_used_insert ON repair_parts_used
  FOR INSERT TO authenticated
  WITH CHECK (current_user_is_tech_staff() AND EXISTS (
    SELECT 1 FROM vehicle_repairs r
    WHERE r.id = repair_parts_used.repair_id
      AND (current_user_is_cmd() OR r.hub_id = current_user_hub_id())));

-- Timeline: inherits the repair's hub for read; any hub staff may append.
CREATE POLICY repair_events_select ON repair_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vehicle_repairs r
    WHERE r.id = repair_events.repair_id
      AND (current_user_is_cmd() OR r.hub_id = current_user_hub_id())));
CREATE POLICY repair_events_insert ON repair_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM vehicle_repairs r
    WHERE r.id = repair_events.repair_id
      AND (current_user_is_cmd() OR r.hub_id = current_user_hub_id())));

-- Factory returns: hub-scoped read; tech staff manage within their hub.
CREATE POLICY factory_returns_select ON factory_returns
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (current_user_is_cmd() OR hub_id = current_user_hub_id()));
CREATE POLICY factory_returns_write ON factory_returns
  FOR ALL TO authenticated
  USING (current_user_is_tech_staff() AND (current_user_is_cmd() OR hub_id = current_user_hub_id()))
  WITH CHECK (current_user_is_tech_staff() AND (current_user_is_cmd() OR hub_id = current_user_hub_id()));
