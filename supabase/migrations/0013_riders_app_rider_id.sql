-- Mobile app rider ID. Only relevant when source = 'App'.
-- Nullable — most riders won't have one.
ALTER TABLE riders ADD COLUMN app_rider_id text;

-- Allow lookups by app_rider_id (sparse index since most rows are NULL).
CREATE INDEX riders_app_rider_id_idx
  ON riders(app_rider_id)
  WHERE app_rider_id IS NOT NULL AND deleted_at IS NULL;
