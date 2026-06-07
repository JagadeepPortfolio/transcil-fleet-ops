-- Rename the alt-contact fields to Emergency Contact and add a relationship.
-- Columns stay nullable (existing rows keep their values / NULLs); the
-- "required" rule is enforced in the UI/zod for new riders.

ALTER TABLE riders RENAME COLUMN alt_contact_name TO emergency_contact_name;
ALTER TABLE riders RENAME COLUMN alt_contact_number TO emergency_contact_number;
ALTER TABLE riders RENAME CONSTRAINT riders_alt_contact_number_check
  TO riders_emergency_contact_number_check;

ALTER TABLE riders ADD COLUMN emergency_contact_relationship text
  CHECK (
    emergency_contact_relationship IS NULL
    OR emergency_contact_relationship IN ('Father', 'Brother', 'Mother', 'Guardian')
  );
