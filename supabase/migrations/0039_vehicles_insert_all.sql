-- Allow any authenticated user to ADD a vehicle (was CMD-only). Edit/delete stay
-- CMD-only. The actor trigger still snapshots created_by_name on insert.
DROP POLICY IF EXISTS vehicles_insert_cmd ON vehicles;

CREATE POLICY vehicles_insert_all ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (true);
