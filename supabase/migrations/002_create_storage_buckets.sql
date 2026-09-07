-- ============================================================
-- Medida's Family — Storage Buckets (M3A)
-- Run via Supabase SQL Editor after 001_create_schema.sql.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('family-photos', 'family-photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('family-documents', 'family-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Permissive storage policies for M3A (replaced in M3B+ with auth-based policies)

CREATE POLICY "m3a_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'family-photos');

CREATE POLICY "m3a_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'family-photos');

CREATE POLICY "m3a_photos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'family-photos');

CREATE POLICY "m3a_photos_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'family-photos');

CREATE POLICY "m3a_docs_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'family-documents');

CREATE POLICY "m3a_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'family-documents');

CREATE POLICY "m3a_docs_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'family-documents');

CREATE POLICY "m3a_docs_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'family-documents');
