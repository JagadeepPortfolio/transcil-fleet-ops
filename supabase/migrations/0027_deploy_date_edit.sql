-- CMD-only deploy-date correction, recorded on the activity timeline.
-- New event type + generic old/new audit columns. The deploy_date update and
-- the timeline row are written together via logActivityEvent (invariant #1).
-- due_date is GENERATED, so it recalculates automatically.

ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'DEPLOY_DATE_EDIT';

ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS old_value text;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS new_value text;

COMMENT ON COLUMN activity_log.old_value IS
  'Previous value for a field correction (e.g. DEPLOY_DATE_EDIT). Generic audit field.';
COMMENT ON COLUMN activity_log.new_value IS
  'New value for a field correction (e.g. DEPLOY_DATE_EDIT). Generic audit field.';
