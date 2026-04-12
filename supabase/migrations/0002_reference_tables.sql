-- Locations: Telangana cities where Transcil operates.
-- Seeded from the Excel LOOKUPS sheet (v2.4).
CREATE TABLE locations (
  id    serial PRIMARY KEY,
  name  text   NOT NULL UNIQUE
);

INSERT INTO locations (name) VALUES
  ('Hyderabad'),
  ('Secunderabad'),
  ('Cyberabad'),
  ('Warangal'),
  ('Karimnagar'),
  ('Nizamabad'),
  ('Khammam'),
  ('Mahbubnagar'),
  ('Nalgonda'),
  ('Adilabad'),
  ('Medak'),
  ('Rangareddy'),
  ('Siddipet'),
  ('Suryapet'),
  ('Jagtial'),
  ('Mancherial'),
  ('Kamareddy'),
  ('Sangareddy'),
  ('Vikarabad'),
  ('Wanaparthy');

-- Hubs: physical deployment centers. code is 3-letter (e.g. HYD, SEC).
CREATE TABLE hubs (
  id           serial PRIMARY KEY,
  code         text   NOT NULL UNIQUE,
  name         text   NOT NULL,
  location_id  int    REFERENCES locations(id)
);

INSERT INTO hubs (code, name, location_id) VALUES
  ('HYD', 'Hyderabad Central Hub',    (SELECT id FROM locations WHERE name = 'Hyderabad')),
  ('SEC', 'Secunderabad Hub',         (SELECT id FROM locations WHERE name = 'Secunderabad')),
  ('CYB', 'Cyberabad Hub',            (SELECT id FROM locations WHERE name = 'Cyberabad')),
  ('WGL', 'Warangal Hub',             (SELECT id FROM locations WHERE name = 'Warangal')),
  ('KAR', 'Karimnagar Hub',           (SELECT id FROM locations WHERE name = 'Karimnagar')),
  ('NZB', 'Nizamabad Hub',            (SELECT id FROM locations WHERE name = 'Nizamabad'));

-- Vehicle types: EV product lines from Transcil catalog.
CREATE TABLE vehicle_types (
  id    serial PRIMARY KEY,
  name  text   NOT NULL UNIQUE
);

INSERT INTO vehicle_types (name) VALUES
  ('E-Bike Standard'),
  ('E-Bike Pro'),
  ('E-Scooter'),
  ('Cargo E-Bike'),
  ('Cargo E-Trike');
