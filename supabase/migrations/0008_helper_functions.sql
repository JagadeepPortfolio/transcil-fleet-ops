-- ============================================================================
-- RLS helper functions.
-- STABLE + SECURITY DEFINER dodges the per-row subquery blowup that
-- `USING (hub_id IN (SELECT …))` causes at scale. Supabase blessed pattern.
-- ============================================================================

CREATE OR REPLACE FUNCTION current_user_role() RETURNS app_role
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM app_users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_hub_id() RETURNS int
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hub_id FROM app_users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_is_cmd() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role = 'CMD' FROM app_users WHERE id = auth.uid()),
    false
  );
$$;
