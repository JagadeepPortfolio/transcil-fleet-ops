-- Riders now capture a free-text "current location" instead of selecting a
-- location from the reference table. The old location_id stays (nullable,
-- unused for new riders) so existing rows and the locations table are untouched.
ALTER TABLE riders ADD COLUMN current_location text;
