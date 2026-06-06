-- Audit "who did it": snapshot the actor's display name on each row at insert.
-- Shows on activity_log (transaction actor) and riders/vehicles (who added).
--
-- A snapshot (vs a live join) is the correct audit semantic and avoids the
-- app_users SELECT RLS, which would otherwise block staff from resolving other
-- users' names. The name = full_name, falling back to login email.

ALTER TABLE activity_log ADD COLUMN created_by_name text;
ALTER TABLE riders       ADD COLUMN created_by_name text;
ALTER TABLE vehicles     ADD COLUMN created_by_name text;

-- SECURITY DEFINER so it can read app_users / auth.users regardless of the
-- inserting user's RLS. Respects an app-provided created_by, else uses auth.uid().
CREATE FUNCTION set_created_by_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  NEW.created_by_name := COALESCE(
    NULLIF((SELECT full_name FROM app_users WHERE id = NEW.created_by), ''),
    (SELECT email FROM auth.users WHERE id = NEW.created_by)
  );
  RETURN NEW;
END $$;

CREATE TRIGGER activity_log_set_actor BEFORE INSERT ON activity_log
  FOR EACH ROW EXECUTE FUNCTION set_created_by_audit();
CREATE TRIGGER riders_set_actor BEFORE INSERT ON riders
  FOR EACH ROW EXECUTE FUNCTION set_created_by_audit();
CREATE TRIGGER vehicles_set_actor BEFORE INSERT ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_created_by_audit();

-- Backfill existing riders/vehicles from their recorded created_by.
-- (activity_log.created_by was never captured, so those stay NULL → "—".)
UPDATE riders r
SET created_by_name = COALESCE(NULLIF(au.full_name, ''), u.email)
FROM auth.users u
LEFT JOIN app_users au ON au.id = u.id
WHERE u.id = r.created_by;

UPDATE vehicles v
SET created_by_name = COALESCE(NULLIF(au.full_name, ''), u.email)
FROM auth.users u
LEFT JOIN app_users au ON au.id = u.id
WHERE u.id = v.created_by;
