-- Verification at return: capture the battery & charger-cable numbers handed
-- back, on the RETURN activity_log row. Compared in the UI against the issued
-- values on the deployment. Nullable; read via select * (no view change).

ALTER TABLE activity_log ADD COLUMN battery_number text;
ALTER TABLE activity_log ADD COLUMN charger_cable_number text;
