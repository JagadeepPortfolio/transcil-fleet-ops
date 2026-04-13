-- ============================================================================
-- CMD bootstrap helper.
--
-- Direct inserts into auth.users fight Supabase's auth internals (no email
-- confirmation hooks, broken login flow, pgcrypto schema-search-path issues).
-- Instead we install a small promotion function.
--
-- Bootstrap flow:
--   1. Create the CMD account via Supabase dashboard:
--        Auth → Users → Add user → cmd@transcil.local + password
--      The handle_new_user trigger auto-creates an app_users row with
--      role='FIELD_STAFF'.
--   2. Run: SELECT public.promote_to_cmd('cmd@transcil.local');
--      This flips role to CMD and clears hub_id.
--
-- Function is idempotent and safe to re-run. Only callable server-side
-- (SECURITY DEFINER with an explicit search_path).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_to_cmd(target_email text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE email = target_email;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for email %', target_email;
  END IF;

  -- The handle_new_user trigger inserts app_users on signup; if for some
  -- reason it didn't fire (e.g. user created before the trigger existed),
  -- upsert here so the function is self-healing.
  INSERT INTO public.app_users (id, full_name, role, hub_id)
  VALUES (target_id, 'Transcil CMD', 'CMD', NULL)
  ON CONFLICT (id) DO UPDATE SET
    role = 'CMD',
    hub_id = NULL;
END;
$$;

-- Only the service role (and superuser) should be able to call this.
-- Revoke the default PUBLIC execute grant.
REVOKE ALL ON FUNCTION public.promote_to_cmd(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_to_cmd(text) TO service_role;
