-- On-the-spot ("minor") repairs done under an ACTIVE deployment.
--
-- These are logged as a repair that is BORN COMPLETED with is_minor=true, so:
--  - they appear in the vehicle's repair history (+ parts decrement inventory),
--  - they DON'T enter the open-repair work queue,
--  - they DON'T change vehicle status (the 0048 trigger's COMPLETED branch only
--    frees a vehicle when there's no active deployment — here there is one).
-- A MINOR_REPAIR activity event is also logged on the deployment timeline.

ALTER TABLE vehicle_repairs ADD COLUMN is_minor boolean NOT NULL DEFAULT false;

ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'MINOR_REPAIR';
