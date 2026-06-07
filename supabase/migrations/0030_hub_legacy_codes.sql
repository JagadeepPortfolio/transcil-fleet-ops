-- Align hub codes with the legacy system's HubIDs, and add Guntur.
-- (App default-hub lookups now resolve Nagole by name, not code.)

UPDATE hubs SET code = 'H25110002' WHERE name = 'Nagole'      AND deleted_at IS NULL;
UPDATE hubs SET code = 'H26030003' WHERE name = 'Kukatpally'  AND deleted_at IS NULL;
UPDATE hubs SET code = 'H26030004' WHERE name = 'Vijayawada'  AND deleted_at IS NULL;
UPDATE hubs SET code = 'H26040005' WHERE name = 'Vizag'       AND deleted_at IS NULL;

INSERT INTO locations (name) VALUES ('Guntur') ON CONFLICT (name) DO NOTHING;
INSERT INTO hubs (code, name, location_id)
  VALUES ('H26060006', 'Guntur', (SELECT id FROM locations WHERE name = 'Guntur'))
  ON CONFLICT (code) DO NOTHING;
