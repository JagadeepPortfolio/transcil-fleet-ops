-- Testing helper: one-call clean wipe of operational data + numbering reset.
--
-- Removes deployments, riders, and vehicles (and activity_log via cascade from
-- deployments), then clears the deployment code counters so numbering restarts
-- at DEP-<year>-1.
--
-- PRESERVES: reference data (hubs, locations, vehicle_types) and users
-- (auth.users / app_users). Does NOT touch Supabase Storage objects (rider
-- photos / ID proofs) — those would need a separate script to clear.
--
-- SECURITY DEFINER so it can TRUNCATE regardless of the caller's RLS; execute
-- is revoked from app users (run it from the SQL editor / service role only).
CREATE FUNCTION reset_test_data() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  TRUNCATE deployments, riders, vehicles CASCADE;
  DELETE FROM deployment_code_counters;
END $$;

REVOKE EXECUTE ON FUNCTION reset_test_data() FROM PUBLIC;
