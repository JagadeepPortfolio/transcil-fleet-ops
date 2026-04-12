-- ============================================================================
-- Storage buckets.
-- All private. Size limits enforced server-side; clients also pre-compress
-- via browser-image-compression before upload.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('rider-photos',     'rider-photos',     false, 409600,  ARRAY['image/jpeg','image/png','image/webp']),
  ('rider-id-proofs',  'rider-id-proofs',  false, 1048576, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('payment-receipts', 'payment-receipts', false, 512000,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('vehicle-photos',   'vehicle-photos',   false, 512000,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- storage.objects RLS: any authenticated user can read/write the private
-- buckets in v1. Hub-scoped path enforcement lands in a later session once
-- upload paths are standardized.
-- ============================================================================
CREATE POLICY "authenticated_read_transcil_buckets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('rider-photos','rider-id-proofs','payment-receipts','vehicle-photos'));

CREATE POLICY "authenticated_insert_transcil_buckets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('rider-photos','rider-id-proofs','payment-receipts','vehicle-photos'));

CREATE POLICY "authenticated_update_transcil_buckets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('rider-photos','rider-id-proofs','payment-receipts','vehicle-photos'));

CREATE POLICY "cmd_delete_transcil_buckets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('rider-photos','rider-id-proofs','payment-receipts','vehicle-photos')
    AND current_user_is_cmd()
  );
