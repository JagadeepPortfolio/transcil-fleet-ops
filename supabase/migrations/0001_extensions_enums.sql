-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive text for phone/email

-- Enums: business-domain state machines
CREATE TYPE rider_source AS ENUM (
  'Walk-in','Reference','Social Media','Dealer','App','Other'
);

CREATE TYPE deployment_status AS ENUM (
  'ACTIVE','RETURNED','LOCKED','CANCELLED'
);

CREATE TYPE pay_status AS ENUM (
  'PAID','PARTIAL','OVERDUE','PENDING'
);

CREATE TYPE action_priority AS ENUM (
  'LOCK_NOW','AT_RISK','CALL_TODAY','UPCOMING','OK'
);

CREATE TYPE call_status AS ENUM (
  'Pending',
  'Called-Will Return',
  'Called-Extending',
  'Called-No Response',
  'Not Required'
);

CREATE TYPE lock_status AS ENUM (
  'Not Locked','Locked','Unlocked'
);

CREATE TYPE deposit_refund_status AS ENUM (
  'Pending','Refunded','Carried Forward'
);

CREATE TYPE activity_event_type AS ENUM (
  'PAYMENT','DEPOSIT','DEPOSIT_REFUND','REPLACEMENT',
  'EXTENSION','RETURN','REMINDER_CALL','LOCK','UNLOCK'
);

CREATE TYPE app_role AS ENUM (
  'CMD','HUB_MANAGER','FIELD_STAFF'
);
