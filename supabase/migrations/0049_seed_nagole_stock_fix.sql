-- Fix for 0047: the seed created NAG stock rows via `WHERE code = 'NAG'`, but
-- the active Nagole hub's code is an opaque legacy id (e.g. 'H25110002'), not
-- 'NAG' — so zero stock rows were created. Resolve the launch hub by NAME
-- (how the rest of the app resolves Nagole) and create qty-0 stock rows for
-- every catalog part. Idempotent.

INSERT INTO spare_part_stock (hub_id, spare_part_id)
SELECT h.id, sp.id
FROM spare_parts sp
CROSS JOIN (SELECT id FROM hubs WHERE name = 'Nagole' AND deleted_at IS NULL LIMIT 1) h
WHERE sp.deleted_at IS NULL
ON CONFLICT DO NOTHING;
