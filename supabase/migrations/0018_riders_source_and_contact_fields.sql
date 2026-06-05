-- Two rider changes:
--   1. Replace the rider_source enum values with the 3 real categories
--      (Individual, 3PL, Camions). Existing non-null sources map to 'Individual'.
--   2. Capture an alternate contact (name + number) and a free-text purpose.

-- ---------------------------------------------------------------------------
-- 1. Swap the rider_source enum.
-- Postgres can't drop enum values in place, so recreate the type and remap.
-- ---------------------------------------------------------------------------
ALTER TYPE rider_source RENAME TO rider_source_old;

CREATE TYPE rider_source AS ENUM ('Individual', '3PL', 'Camions');

ALTER TABLE riders
  ALTER COLUMN source TYPE rider_source
  USING (CASE WHEN source IS NULL THEN NULL ELSE 'Individual' END::rider_source);

DROP TYPE rider_source_old;

-- ---------------------------------------------------------------------------
-- 2. Alternate contact + purpose.
-- ---------------------------------------------------------------------------
ALTER TABLE riders
  ADD COLUMN alt_contact_name   text,
  ADD COLUMN alt_contact_number text,
  ADD COLUMN purpose            text;

-- Mirror the main phone format check, but allow NULL (the field is optional).
ALTER TABLE riders
  ADD CONSTRAINT riders_alt_contact_number_check
  CHECK (alt_contact_number IS NULL OR alt_contact_number ~ '^[0-9]{10}$');
