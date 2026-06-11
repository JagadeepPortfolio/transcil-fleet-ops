-- One-time normalization: uppercase identifiers & names on existing rows so
-- they match the new on-save behavior (free-text notes are left as-is).
-- upper() is idempotent, so re-running on a fresh DB is harmless.

UPDATE riders SET
  name                    = upper(name),
  address                 = upper(address),
  current_location        = upper(current_location),
  emergency_contact_name  = upper(emergency_contact_name),
  app_rider_id            = upper(app_rider_id),
  store_id                = upper(store_id),
  store_name              = upper(store_name),
  store_location          = upper(store_location),
  purpose_other           = upper(purpose_other)
WHERE deleted_at IS NULL;

UPDATE vehicles SET
  vtd_no     = upper(vtd_no),
  vehicle_id = upper(vehicle_id),
  chassis_no = upper(chassis_no),
  colour     = upper(colour)
WHERE deleted_at IS NULL;

UPDATE deployments SET
  battery_number       = upper(battery_number),
  battery_number_2     = upper(battery_number_2),
  charger_cable_number = upper(charger_cable_number)
WHERE deleted_at IS NULL;

UPDATE activity_log SET
  transaction_id            = upper(transaction_id),
  additional_transaction_id = upper(additional_transaction_id),
  battery_number            = upper(battery_number),
  battery_number_2          = upper(battery_number_2),
  charger_cable_number      = upper(charger_cable_number),
  old_vtd                   = upper(old_vtd),
  new_vtd                   = upper(new_vtd)
WHERE deleted_at IS NULL;
