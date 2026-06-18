-- Restrict rider edits to CMD. Riders were never edited in the app before
-- (no update path), so tightening UPDATE to CMD is safe and matches the new
-- CMD-only "Edit rider" screen. (Insert stays open to all authenticated;
-- delete was already CMD-only.)

DROP POLICY IF EXISTS riders_update ON riders;
CREATE POLICY riders_update ON riders
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND current_user_is_cmd())
  WITH CHECK (current_user_is_cmd());
