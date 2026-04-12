-- ============================================================================
-- CMD bootstrap.
--
-- Creates the first CMD user with a hardcoded UUID so migrations can run
-- idempotently. Password is a well-known dev placeholder — CHANGE IT
-- IMMEDIATELY after first login via Supabase dashboard, or the README will
-- haunt you.
--
-- In production (Supabase cloud) you may prefer to create the CMD user via
-- the Auth dashboard, then run only the app_users upsert. That path works
-- because the on_auth_user_created trigger will have already inserted a row
-- with role='FIELD_STAFF'; the upsert below flips it to 'CMD'.
-- ============================================================================

DO $$
DECLARE
  cmd_id uuid := '00000000-0000-0000-0000-00000000c0d0';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = cmd_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password,
      email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      cmd_id,
      'authenticated', 'authenticated',
      'cmd@transcil.local',
      crypt('ChangeMe!2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Transcil CMD"}'::jsonb,
      now(), now(),
      '', '', '', ''
    );
  END IF;

  -- Promote to CMD (handle_new_user trigger set them to FIELD_STAFF)
  INSERT INTO app_users (id, full_name, role, hub_id)
  VALUES (cmd_id, 'Transcil CMD', 'CMD', NULL)
  ON CONFLICT (id) DO UPDATE SET
    role = 'CMD',
    full_name = 'Transcil CMD',
    hub_id = NULL;
END $$;
