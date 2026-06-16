-- Vehicle-repair subsystem, part 2 of 4: spare-parts inventory.
--
-- Model (per-hub stock, confirmed requirement):
--   spare_part_categories  reference list of part categories
--   spare_parts            CATALOG — one row per distinct part (shared across hubs)
--   spare_part_stock       per-hub quantity_on_hand + reorder_level (hub_id, part)
--   spare_part_movements   AUDIT LEDGER (RECEIVED / USED / ADJUST). The single
--                          write path inserts a movement AND updates the matching
--                          stock row in one call — stock can never drift (mirrors
--                          deployments + activity_log, invariant #1).
--
-- Defective parts sent back to Calon are NOT modelled here — see factory_returns
-- in 0046 (they were never good stock).

-- ── Role helpers (reference the roles added & committed in 0044) ──────────────
-- role::text comparison (not the enum literal) so these functions don't depend
-- on the new enum values being visible at creation time — robust no matter how
-- the migration runner batches transactions.
CREATE OR REPLACE FUNCTION current_user_is_tech_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role::text IN ('CMD','TECH_SUPERVISOR','TECHNICIAN') FROM app_users WHERE id = auth.uid()),
    false)
$$;

CREATE OR REPLACE FUNCTION current_user_can_manage_inventory() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role::text IN ('CMD','TECH_SUPERVISOR') FROM app_users WHERE id = auth.uid()),
    false)
$$;

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE spare_part_categories (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE UNIQUE INDEX spare_part_categories_name_uniq
  ON spare_part_categories (lower(name)) WHERE deleted_at IS NULL;

-- ── Catalog (part definitions, shared across hubs) ────────────────────────────
CREATE TABLE spare_parts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  category_id     int REFERENCES spare_part_categories(id),
  part_number     text,
  unit            text NOT NULL DEFAULT 'piece',
  notes           text,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE UNIQUE INDEX spare_parts_name_uniq
  ON spare_parts (lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX spare_parts_category_idx ON spare_parts (category_id);

CREATE TRIGGER spare_parts_set_actor BEFORE INSERT ON spare_parts
  FOR EACH ROW EXECUTE FUNCTION set_created_by_audit();
CREATE TRIGGER spare_parts_set_updated BEFORE UPDATE ON spare_parts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Per-hub stock ─────────────────────────────────────────────────────────────
CREATE TABLE spare_part_stock (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id           int NOT NULL REFERENCES hubs(id),
  spare_part_id    uuid NOT NULL REFERENCES spare_parts(id),
  quantity_on_hand int NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_level    int NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE UNIQUE INDEX spare_part_stock_hub_part_uniq
  ON spare_part_stock (hub_id, spare_part_id) WHERE deleted_at IS NULL;
CREATE INDEX spare_part_stock_hub_idx ON spare_part_stock (hub_id);

CREATE TRIGGER spare_part_stock_set_updated BEFORE UPDATE ON spare_part_stock
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Movement ledger ───────────────────────────────────────────────────────────
CREATE TABLE spare_part_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id          int NOT NULL REFERENCES hubs(id),
  spare_part_id   uuid NOT NULL REFERENCES spare_parts(id),
  movement_type   text NOT NULL CHECK (movement_type IN ('RECEIVED','USED','ADJUST')),
  -- Signed change applied to quantity_on_hand: RECEIVED > 0, USED < 0,
  -- ADJUST either sign. The sum of deltas for a (hub, part) equals on-hand.
  quantity_delta  int NOT NULL,
  repair_id       uuid,        -- set when movement_type = USED (FK added in 0046)
  reason          text,
  notes           text,
  event_date      date NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX spare_part_movements_hub_part_idx ON spare_part_movements (hub_id, spare_part_id);
CREATE INDEX spare_part_movements_repair_idx ON spare_part_movements (repair_id);
CREATE INDEX spare_part_movements_date_idx ON spare_part_movements (event_date);

CREATE TRIGGER spare_part_movements_set_actor BEFORE INSERT ON spare_part_movements
  FOR EACH ROW EXECUTE FUNCTION set_created_by_audit();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE spare_part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_parts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_stock      ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_movements  ENABLE ROW LEVEL SECURITY;

-- Categories: everyone reads; supervisors/CMD manage.
CREATE POLICY spare_part_categories_select ON spare_part_categories
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY spare_part_categories_write ON spare_part_categories
  FOR ALL TO authenticated
  USING (current_user_can_manage_inventory())
  WITH CHECK (current_user_can_manage_inventory());

-- Catalog: everyone reads; supervisors/CMD manage.
CREATE POLICY spare_parts_select ON spare_parts
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY spare_parts_write ON spare_parts
  FOR ALL TO authenticated
  USING (current_user_can_manage_inventory())
  WITH CHECK (current_user_can_manage_inventory());

-- Stock: hub-scoped read; supervisors/CMD manage within their hub.
CREATE POLICY spare_part_stock_select ON spare_part_stock
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (current_user_is_cmd() OR hub_id = current_user_hub_id()));
CREATE POLICY spare_part_stock_write ON spare_part_stock
  FOR ALL TO authenticated
  USING (current_user_can_manage_inventory() AND (current_user_is_cmd() OR hub_id = current_user_hub_id()))
  WITH CHECK (current_user_can_manage_inventory() AND (current_user_is_cmd() OR hub_id = current_user_hub_id()));

-- Movements: hub-scoped read; technicians/supervisors/CMD insert within their hub.
CREATE POLICY spare_part_movements_select ON spare_part_movements
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (current_user_is_cmd() OR hub_id = current_user_hub_id()));
CREATE POLICY spare_part_movements_insert ON spare_part_movements
  FOR INSERT TO authenticated
  WITH CHECK (current_user_is_tech_staff() AND (current_user_is_cmd() OR hub_id = current_user_hub_id()));
-- Corrections are append-only in spirit; only supervisors/CMD may amend/soft-delete.
CREATE POLICY spare_part_movements_update ON spare_part_movements
  FOR UPDATE TO authenticated
  USING (current_user_can_manage_inventory() AND (current_user_is_cmd() OR hub_id = current_user_hub_id()));
