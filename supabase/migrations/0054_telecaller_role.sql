-- TELECALLER role — follow-up / collections staff. Hub-scoped (assigned via
-- promote_to_role). In the UI they get only the Record payment / Extend /
-- Log reminder call deployment actions, and see Dashboard / Riders /
-- Deployments / Reports (not Vehicles / Repairs / Inventory). The 3 allowed
-- actions run through the existing hub-scoped activity_log RLS — no policy
-- change needed.

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'TELECALLER';
