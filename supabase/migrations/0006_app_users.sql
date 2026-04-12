-- ============================================================================
-- APP USERS
-- Extends auth.users with application-level role + hub scoping.
-- Field staff + hub managers must have a hub. CMD can be null (operates above hubs).
-- ============================================================================
CREATE TABLE app_users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  phone       text,
  role        app_role NOT NULL DEFAULT 'FIELD_STAFF',
  hub_id      int REFERENCES hubs(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_users ADD CONSTRAINT role_hub_check
  CHECK (role = 'CMD' OR hub_id IS NOT NULL);

CREATE TRIGGER app_users_updated_at BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create an app_users row whenever an auth.users row is created.
-- SECURITY DEFINER + explicit search_path is the Supabase blessed pattern.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO app_users (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
