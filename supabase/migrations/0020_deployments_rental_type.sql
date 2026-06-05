-- Capture whether a deployment is billed Weekly or Monthly.
-- Existing deployments default to Weekly (the prior implicit behaviour).
CREATE TYPE rental_type AS ENUM ('Weekly', 'Monthly');

ALTER TABLE deployments
  ADD COLUMN rental_type rental_type NOT NULL DEFAULT 'Weekly';
