-- ============================================================================
-- Row Level Security
--
-- Reference tables (locations, hubs, vehicle_types): readable by any
-- authenticated user. Writes happen via service-role only (CMD edits through
-- Supabase Studio in v1; admin UI comes later).
--
-- Core tables: CMD has full CRUD; hub-scoped roles see only their hub.
-- Riders are readable by any authenticated user (multi-hub rider visibility
-- is deliberate — a rider may deploy from different hubs over time).
-- ============================================================================

-- Enable RLS everywhere
ALTER TABLE locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users     ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Reference tables: read-only for everyone signed in
-- ============================================================================
CREATE POLICY locations_select ON locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY hubs_select ON hubs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY vehicle_types_select ON vehicle_types
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- RIDERS: everyone reads, everyone writes, CMD can delete
-- ============================================================================
CREATE POLICY riders_select ON riders
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY riders_insert ON riders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY riders_update ON riders
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY riders_delete_cmd ON riders
  FOR DELETE TO authenticated
  USING (current_user_is_cmd());

-- ============================================================================
-- VEHICLES: everyone reads (for dropdowns); CMD-only writes
-- ============================================================================
CREATE POLICY vehicles_select ON vehicles
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY vehicles_insert_cmd ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (current_user_is_cmd());

CREATE POLICY vehicles_update_cmd ON vehicles
  FOR UPDATE TO authenticated
  USING (current_user_is_cmd())
  WITH CHECK (current_user_is_cmd());

CREATE POLICY vehicles_delete_cmd ON vehicles
  FOR DELETE TO authenticated
  USING (current_user_is_cmd());

-- ============================================================================
-- DEPLOYMENTS: CMD sees all; hub-scoped roles see only their hub
-- ============================================================================
CREATE POLICY deployments_select ON deployments
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      current_user_is_cmd()
      OR hub_id = current_user_hub_id()
    )
  );

CREATE POLICY deployments_insert ON deployments
  FOR INSERT TO authenticated
  WITH CHECK (
    current_user_is_cmd()
    OR hub_id = current_user_hub_id()
  );

CREATE POLICY deployments_update ON deployments
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      current_user_is_cmd()
      OR hub_id = current_user_hub_id()
    )
  )
  WITH CHECK (
    current_user_is_cmd()
    OR hub_id = current_user_hub_id()
  );

CREATE POLICY deployments_delete_cmd ON deployments
  FOR DELETE TO authenticated
  USING (current_user_is_cmd());

-- ============================================================================
-- ACTIVITY_LOG: inherit visibility from parent deployment
-- ============================================================================
CREATE POLICY activity_log_select ON activity_log
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM deployments d
      WHERE d.id = activity_log.deployment_id
        AND d.deleted_at IS NULL
        AND (current_user_is_cmd() OR d.hub_id = current_user_hub_id())
    )
  );

CREATE POLICY activity_log_insert ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deployments d
      WHERE d.id = activity_log.deployment_id
        AND d.deleted_at IS NULL
        AND (current_user_is_cmd() OR d.hub_id = current_user_hub_id())
    )
  );

CREATE POLICY activity_log_update ON activity_log
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM deployments d
      WHERE d.id = activity_log.deployment_id
        AND (current_user_is_cmd() OR d.hub_id = current_user_hub_id())
    )
  );

CREATE POLICY activity_log_delete_cmd ON activity_log
  FOR DELETE TO authenticated
  USING (current_user_is_cmd());

-- ============================================================================
-- APP_USERS: users see themselves, CMD sees everyone
-- ============================================================================
CREATE POLICY app_users_select_self ON app_users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR current_user_is_cmd());

CREATE POLICY app_users_update_self_name ON app_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR current_user_is_cmd())
  WITH CHECK (id = auth.uid() OR current_user_is_cmd());

CREATE POLICY app_users_insert_cmd ON app_users
  FOR INSERT TO authenticated
  WITH CHECK (current_user_is_cmd());

CREATE POLICY app_users_delete_cmd ON app_users
  FOR DELETE TO authenticated
  USING (current_user_is_cmd());
