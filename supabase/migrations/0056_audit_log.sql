-- Field-level change audit for the editable master records (riders, vehicles,
-- deployments). A SECURITY DEFINER trigger records every INSERT/UPDATE/DELETE
-- with the acting user + a before→after diff. Trigger-level → nothing can
-- bypass it (even direct SQL edits). CMD-only read.

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  table_name  text NOT NULL,
  row_id      text NOT NULL,
  action      text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  actor       uuid,
  actor_name  text,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changes     jsonb        -- UPDATE: {field:{old,new}} of changed cols; DELETE: full old row
);
CREATE INDEX audit_log_row_idx ON audit_log (table_name, row_id, changed_at DESC);
CREATE INDEX audit_log_time_idx ON audit_log (changed_at DESC);

CREATE OR REPLACE FUNCTION audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name  text;
  v_old   jsonb;
  v_new   jsonb;
  v_changes jsonb := '{}'::jsonb;
  k text;
  -- Noise columns that change on every write — excluded from the diff.
  ignore text[] := ARRAY['updated_at','updated_by','created_at'];
BEGIN
  SELECT NULLIF(full_name, '') INTO v_name FROM app_users WHERE id = v_actor;
  IF v_name IS NULL THEN
    SELECT email INTO v_name FROM auth.users WHERE id = v_actor;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF k = ANY(ignore) THEN CONTINUE; END IF;
      IF (v_old -> k) IS DISTINCT FROM (v_new -> k) THEN
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('old', v_old -> k, 'new', v_new -> k));
      END IF;
    END LOOP;
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW; -- nothing meaningful changed (e.g. only updated_at)
    END IF;
    INSERT INTO audit_log (table_name, row_id, action, actor, actor_name, changes)
    VALUES (TG_TABLE_NAME, (v_new ->> 'id'), 'UPDATE', v_actor, v_name, v_changes);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, row_id, action, actor, actor_name, changes)
    VALUES (TG_TABLE_NAME, (to_jsonb(NEW) ->> 'id'), 'INSERT', v_actor, v_name, NULL);
    RETURN NEW;
  ELSE
    INSERT INTO audit_log (table_name, row_id, action, actor, actor_name, changes)
    VALUES (TG_TABLE_NAME, (to_jsonb(OLD) ->> 'id'), 'DELETE', v_actor, v_name, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER riders_audit       AFTER INSERT OR UPDATE OR DELETE ON riders       FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER vehicles_audit     AFTER INSERT OR UPDATE OR DELETE ON vehicles     FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER deployments_audit  AFTER INSERT OR UPDATE OR DELETE ON deployments  FOR EACH ROW EXECUTE FUNCTION audit_row_change();

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON audit_log TO authenticated;
CREATE POLICY audit_log_select_cmd ON audit_log
  FOR SELECT TO authenticated USING (current_user_is_cmd());
