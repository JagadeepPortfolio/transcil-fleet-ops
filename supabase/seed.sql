-- ============================================================================
-- Dev seed data.
-- Safe to re-run; uses ON CONFLICT DO NOTHING where natural keys exist and
-- deterministic UUIDs elsewhere.
--
-- Expected state after seeding:
--   3 vehicles: VTD-DEV-001/002/003
--   5 riders:   RIDER-001..005
--   2 deployments: one OK, one LOCK_NOW (deploy_date 10 days ago, 1-week term)
-- ============================================================================

-- Vehicles
INSERT INTO vehicles (id, vtd_no, vehicle_id, vehicle_type_id, colour)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'VTD-DEV-001', 'HYD-EB-001',
     (SELECT id FROM vehicle_types WHERE name = 'E-Bike Standard'), 'White'),
  ('10000000-0000-0000-0000-000000000002', 'VTD-DEV-002', 'HYD-EB-002',
     (SELECT id FROM vehicle_types WHERE name = 'E-Bike Pro'), 'Red'),
  ('10000000-0000-0000-0000-000000000003', 'VTD-DEV-003', 'HYD-ES-001',
     (SELECT id FROM vehicle_types WHERE name = 'E-Scooter'), 'Black')
ON CONFLICT (id) DO NOTHING;

-- Riders
INSERT INTO riders (id, name, phone, source, location_id, address)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Ravi Kumar',   '9000000001',
     'Walk-in',     (SELECT id FROM locations WHERE name = 'Hyderabad'),    'Kukatpally, Hyderabad'),
  ('20000000-0000-0000-0000-000000000002', 'Suresh Reddy', '9000000002',
     'Reference',   (SELECT id FROM locations WHERE name = 'Secunderabad'), 'Tarnaka, Secunderabad'),
  ('20000000-0000-0000-0000-000000000003', 'Arjun Varma',  '9000000003',
     'Social Media',(SELECT id FROM locations WHERE name = 'Cyberabad'),    'Gachibowli, Cyberabad'),
  ('20000000-0000-0000-0000-000000000004', 'Mahesh Goud',  '9000000004',
     'Dealer',      (SELECT id FROM locations WHERE name = 'Warangal'),     'Hanamkonda, Warangal'),
  ('20000000-0000-0000-0000-000000000005', 'Kiran Rao',    '9000000005',
     'App',         (SELECT id FROM locations WHERE name = 'Hyderabad'),    'LB Nagar, Hyderabad')
ON CONFLICT (id) DO NOTHING;

-- Deployments
-- #1: OK state — deployed 2 days ago, 4-week term
INSERT INTO deployments (
  id, rider_id, vehicle_id, hub_id,
  deploy_date, weeks, rate_inr,
  deposit_required_inr, new_deposit_needed, status
)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  (SELECT id FROM hubs WHERE code = 'HYD'),
  ((CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - 2),
  4, 1500.00,
  3000.00, true, 'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- #2: LOCK_NOW state — deployed 10 days ago, 1-week term (overdue)
INSERT INTO deployments (
  id, rider_id, vehicle_id, hub_id,
  deploy_date, weeks, rate_inr,
  deposit_required_inr, new_deposit_needed, status
)
VALUES (
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  (SELECT id FROM hubs WHERE code = 'SEC'),
  ((CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - 10),
  1, 1800.00,
  3500.00, true, 'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;
