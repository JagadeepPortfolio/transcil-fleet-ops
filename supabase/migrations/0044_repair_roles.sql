-- Vehicle-repair subsystem, part 1 of 4: new staff roles.
--
-- Adds TECHNICIAN and TECH_SUPERVISOR to app_role. These MUST live in their own
-- migration (committed) before later migrations reference the new values in RLS
-- policies — Postgres forbids using a freshly-added enum value in the same
-- transaction that added it.
--
--   Customer Officer  = existing FIELD_STAFF / HUB_MANAGER (they already do returns)
--   TECHNICIAN        = works repairs, records parts used, completes repairs
--   TECH_SUPERVISOR   = the above + manages inventory and factory returns/requests

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'TECHNICIAN';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'TECH_SUPERVISOR';

-- Admin helper to assign a role (+ optional hub) by email. Mirrors
-- promote_to_cmd(); used from the SQL editor until the user-admin UI ships.
-- Non-CMD roles need a hub, so pass target_hub_code for technicians/supervisors.
CREATE OR REPLACE FUNCTION promote_to_role(
  user_email text,
  new_role app_role,
  target_hub_code text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  hid int;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = user_email;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user with email %', user_email;
  END IF;

  IF target_hub_code IS NOT NULL THEN
    SELECT id INTO hid FROM hubs WHERE code = target_hub_code AND deleted_at IS NULL;
    IF hid IS NULL THEN
      RAISE EXCEPTION 'No active hub with code %', target_hub_code;
    END IF;
  END IF;

  UPDATE app_users
  SET role = new_role,
      hub_id = COALESCE(hid, hub_id)
  WHERE id = uid;
END;
$$;
