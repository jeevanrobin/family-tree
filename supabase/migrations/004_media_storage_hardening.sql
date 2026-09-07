-- ============================================================
-- Medida's Family — Media Storage Hardening (Milestone 3D)
--
-- Extends media and documents tables with file metadata,
-- enforces at most one primary photo per person,
-- and hardens private storage bucket security.
-- ============================================================

-- ── 1. Extend Media (Photos) Table ───────────────────────────

ALTER TABLE media ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT '';
ALTER TABLE media ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT NULL;
ALTER TABLE media ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT NULL;
ALTER TABLE media ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure auto-update trigger exists on media
DROP TRIGGER IF EXISTS set_updated_at_media ON media;
CREATE TRIGGER set_updated_at_media BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Database-level constraint: at most one primary photo per person
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_person_primary
  ON media (person_id)
  WHERE is_primary = true;

-- ── 2. Extend Documents Table ────────────────────────────────

ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT '';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure auto-update trigger exists on documents
DROP TRIGGER IF EXISTS set_updated_at_documents ON documents;
CREATE TRIGGER set_updated_at_documents BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── 3. Strict Storage Bucket Privacy ─────────────────────────

-- Ensure buckets are strictly private
UPDATE storage.buckets SET public = false WHERE id IN ('family-photos', 'family-documents');

-- ── 4. Storage Orphan & Consistency Diagnostics ──────────────

CREATE OR REPLACE FUNCTION public.check_storage_consistency(target_family_id UUID)
RETURNS TABLE (
  entity_type TEXT,
  record_id UUID,
  storage_path TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has access to target family
  IF NOT public.has_family_role(target_family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']) THEN
    RAISE EXCEPTION 'Access denied to family %', target_family_id;
  END IF;

  RETURN QUERY
  SELECT
    'photo'::TEXT AS entity_type,
    m.id AS record_id,
    m.storage_path,
    (m.storage_path IS NOT NULL AND m.storage_path <> '') AS is_valid
  FROM media m
  WHERE m.family_id = target_family_id
  UNION ALL
  SELECT
    'document'::TEXT AS entity_type,
    d.id AS record_id,
    d.storage_path,
    (d.storage_path IS NOT NULL AND d.storage_path <> '') AS is_valid
  FROM documents d
  WHERE d.family_id = target_family_id;
END;
$$;
