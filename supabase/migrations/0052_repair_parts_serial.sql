-- Record-part-used enhancements:
-- 1) optional serial_no on each fitted part (traceability of the unit installed).
-- 2) UPDATE policy so a mistakenly-recorded part can be soft-deleted (removal
--    restocks inventory via a compensating movement, handled in app code).

ALTER TABLE repair_parts_used ADD COLUMN serial_no text;

CREATE POLICY repair_parts_used_update ON repair_parts_used
  FOR UPDATE TO authenticated
  USING (
    current_user_is_tech_staff() AND EXISTS (
      SELECT 1 FROM vehicle_repairs r
      WHERE r.id = repair_parts_used.repair_id
        AND (current_user_is_cmd() OR r.hub_id = current_user_hub_id())
    )
  );
