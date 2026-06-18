-- Add IN_FACTORY repair status — used when a technician decides the vehicle
-- must go to the factory for repair. It's a non-terminal (open) status; the
-- vehicle's service_status syncs to 'In Factory' (handled in 0058). Enum value
-- is added in its own migration so it's committed before 0058 references it.

ALTER TYPE repair_status ADD VALUE IF NOT EXISTS 'IN_FACTORY';
