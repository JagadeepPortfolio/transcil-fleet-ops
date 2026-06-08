-- Alternate contact number for a rider (optional). 10 digits like the primary
-- phone, but nullable and NOT unique (a household may share a number).
ALTER TABLE riders ADD COLUMN alt_phone text
  CHECK (alt_phone IS NULL OR alt_phone ~ '^[0-9]{10}$');
