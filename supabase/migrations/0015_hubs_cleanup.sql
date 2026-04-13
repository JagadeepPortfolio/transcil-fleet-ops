-- Replace the 6 placeholder hubs with the 4 actual operating hubs.
-- Soft-delete existing hubs (they may be referenced by deployments/vehicles).
UPDATE hubs SET name = name || ' [retired]' WHERE code NOT IN ('NAG', 'KUK', 'VJA', 'VIZ');

-- Insert the 4 real hubs
INSERT INTO hubs (code, name, location_id) VALUES
  ('NAG', 'Nagole',      (SELECT id FROM locations WHERE name = 'Hyderabad')),
  ('KUK', 'Kukatpally',  (SELECT id FROM locations WHERE name = 'Hyderabad')),
  ('VJA', 'Vijayawada',  NULL),
  ('VIZ', 'Vizag',       NULL);

-- Add locations for the new cities if they don't exist
INSERT INTO locations (name) VALUES ('Vijayawada'), ('Vizag')
  ON CONFLICT (name) DO NOTHING;

-- Now link them
UPDATE hubs SET location_id = (SELECT id FROM locations WHERE name = 'Vijayawada') WHERE code = 'VJA';
UPDATE hubs SET location_id = (SELECT id FROM locations WHERE name = 'Vizag') WHERE code = 'VIZ';

-- Hide retired hubs from the UI by marking them deleted.
-- Any existing deployments/vehicles still FK to them (no cascade).
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
UPDATE hubs SET deleted_at = now() WHERE name LIKE '%[retired]%';
