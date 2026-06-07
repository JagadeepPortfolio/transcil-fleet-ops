-- Structured Purpose: `purpose` now holds the selected option (delivery platform
-- or 'Others'). For a platform we capture store details; for 'Others' a free-text
-- description. Columns nullable (existing rows safe); "required" enforced in zod.
-- No CHECK on `purpose` — legacy rows hold arbitrary free text.

ALTER TABLE riders ADD COLUMN store_id       text;
ALTER TABLE riders ADD COLUMN store_name     text;
ALTER TABLE riders ADD COLUMN store_location text;
ALTER TABLE riders ADD COLUMN purpose_other  text;
