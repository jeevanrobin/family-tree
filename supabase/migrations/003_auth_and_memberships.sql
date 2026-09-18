-- ============================================================
-- Medida's Family — Authentication, Memberships & Production RLS (M3B)
--
-- Replaces all permissive M3A development policies with authoritative,
-- non-recursive Row-Level Security enforced at the database level.
--
-- Roles:
--   - owner: Full family administration, membership management, full CRUD.
--   - editor: Read family, CRUD on people, relationships, stories, events, media, docs.
--   - contributor: Read family, create/update stories, events, media, docs.
--   - viewer: Read-only access across the entire family tree dossier.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Families schema enhancement ───────────────────────────

ALTER TABLE families ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. Family Memberships Table ──────────────────────────────

CREATE TABLE IF NOT EXISTS family_memberships (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('owner', 'editor', 'contributor', 'viewer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_family_membership_user UNIQUE (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_memberships_family ON family_memberships(family_id);
CREATE INDEX IF NOT EXISTS idx_family_memberships_user ON family_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_family_memberships_role ON family_memberships(family_id, role);

-- Trigger for updated_at on memberships
DROP TRIGGER IF EXISTS set_updated_at_memberships ON family_memberships;
CREATE TRIGGER set_updated_at_memberships BEFORE UPDATE ON family_memberships
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── 3. Non-recursive Security Functions ───────────────────────
-- SECURITY DEFINER with fixed search_path prevents infinite RLS recursion.

CREATE OR REPLACE FUNCTION public.get_family_role(check_family_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM family_memberships
  WHERE family_id = check_family_id AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_family_role(check_family_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_memberships
    WHERE family_id = check_family_id
      AND user_id = auth.uid()
      AND role = ANY(allowed_roles)
  );
$$;

-- Extracts family UUID from storage object name: supports "family/<uuid>/..." or "<uuid>/..."
CREATE OR REPLACE FUNCTION public.extract_storage_family_id(object_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  parts TEXT[];
BEGIN
  parts := string_to_array(object_name, '/');
  IF array_length(parts, 1) >= 2 AND parts[1] = 'family' THEN
    BEGIN
      RETURN parts[2]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  ELSIF array_length(parts, 1) >= 1 THEN
    BEGIN
      RETURN parts[1]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$;

-- ── 4. Drop all permissive M3A development policies ───────────

DROP POLICY IF EXISTS "m3a_allow_all" ON families;
DROP POLICY IF EXISTS "m3a_allow_all" ON family_members;
DROP POLICY IF EXISTS "m3a_allow_all" ON relationships;
DROP POLICY IF EXISTS "m3a_allow_all" ON stories;
DROP POLICY IF EXISTS "m3a_allow_all" ON story_persons;
DROP POLICY IF EXISTS "m3a_allow_all" ON life_events;
DROP POLICY IF EXISTS "m3a_allow_all" ON life_event_persons;
DROP POLICY IF EXISTS "m3a_allow_all" ON media;
DROP POLICY IF EXISTS "m3a_allow_all" ON media_persons;
DROP POLICY IF EXISTS "m3a_allow_all" ON documents;

DROP POLICY IF EXISTS "m3a_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "m3a_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "m3a_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "m3a_photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "m3a_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "m3a_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "m3a_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "m3a_docs_delete" ON storage.objects;

-- Ensure RLS is active on all tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_event_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ── 5. Production Table Policies ──────────────────────────────

-- [families]
CREATE POLICY "families_select_member" ON families
  FOR SELECT TO authenticated
  USING (public.has_family_role(id, ARRAY['owner', 'editor', 'contributor', 'viewer']));

CREATE POLICY "families_insert_authenticated" ON families
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "families_update_owner" ON families
  FOR UPDATE TO authenticated
  USING (public.has_family_role(id, ARRAY['owner']))
  WITH CHECK (public.has_family_role(id, ARRAY['owner']));

CREATE POLICY "families_delete_owner" ON families
  FOR DELETE TO authenticated
  USING (public.has_family_role(id, ARRAY['owner']));

-- [family_memberships]
CREATE POLICY "memberships_select_self_or_owner" ON family_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_family_role(family_id, ARRAY['owner'])
  );

CREATE POLICY "memberships_insert_owner_or_initial" ON family_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User adding themselves as initial owner, or existing owner adding members
    (user_id = auth.uid()) OR
    public.has_family_role(family_id, ARRAY['owner'])
  );

CREATE POLICY "memberships_update_owner" ON family_memberships
  FOR UPDATE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner']))
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner']));

CREATE POLICY "memberships_delete_owner_or_self" ON family_memberships
  FOR DELETE TO authenticated
  USING (
    public.has_family_role(family_id, ARRAY['owner']) OR
    user_id = auth.uid()
  );

-- [family_members] (People)
CREATE POLICY "family_members_select" ON family_members
  FOR SELECT TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']));

CREATE POLICY "family_members_insert" ON family_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor']));

CREATE POLICY "family_members_update" ON family_members
  FOR UPDATE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']))
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor']));

CREATE POLICY "family_members_delete" ON family_members
  FOR DELETE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']));

-- [relationships]
CREATE POLICY "relationships_select" ON relationships
  FOR SELECT TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']));

CREATE POLICY "relationships_insert" ON relationships
  FOR INSERT TO authenticated
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor']));

CREATE POLICY "relationships_update" ON relationships
  FOR UPDATE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']))
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor']));

CREATE POLICY "relationships_delete" ON relationships
  FOR DELETE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']));

-- [stories]
CREATE POLICY "stories_select" ON stories
  FOR SELECT TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']));

CREATE POLICY "stories_insert" ON stories
  FOR INSERT TO authenticated
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']));

CREATE POLICY "stories_update" ON stories
  FOR UPDATE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']))
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']));

CREATE POLICY "stories_delete" ON stories
  FOR DELETE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']));

-- [story_persons]
CREATE POLICY "story_persons_select" ON story_persons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = story_persons.story_id
        AND public.has_family_role(s.family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
    )
  );

CREATE POLICY "story_persons_insert" ON story_persons
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = story_persons.story_id
        AND public.has_family_role(s.family_id, ARRAY['owner', 'editor', 'contributor'])
    )
  );

CREATE POLICY "story_persons_delete" ON story_persons
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = story_persons.story_id
        AND public.has_family_role(s.family_id, ARRAY['owner', 'editor', 'contributor'])
    )
  );

-- [life_events]
CREATE POLICY "life_events_select" ON life_events
  FOR SELECT TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']));

CREATE POLICY "life_events_insert" ON life_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']));

CREATE POLICY "life_events_update" ON life_events
  FOR UPDATE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']))
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']));

CREATE POLICY "life_events_delete" ON life_events
  FOR DELETE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']));

-- [life_event_persons]
CREATE POLICY "life_event_persons_select" ON life_event_persons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM life_events e
      WHERE e.id = life_event_persons.life_event_id
        AND public.has_family_role(e.family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
    )
  );

CREATE POLICY "life_event_persons_insert" ON life_event_persons
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM life_events e
      WHERE e.id = life_event_persons.life_event_id
        AND public.has_family_role(e.family_id, ARRAY['owner', 'editor', 'contributor'])
    )
  );

CREATE POLICY "life_event_persons_delete" ON life_event_persons
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM life_events e
      WHERE e.id = life_event_persons.life_event_id
        AND public.has_family_role(e.family_id, ARRAY['owner', 'editor', 'contributor'])
    )
  );

-- [media]
CREATE POLICY "media_select" ON media
  FOR SELECT TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']));

CREATE POLICY "media_insert" ON media
  FOR INSERT TO authenticated
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']));

CREATE POLICY "media_update" ON media
  FOR UPDATE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']))
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']));

CREATE POLICY "media_delete" ON media
  FOR DELETE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']));

-- [media_persons]
CREATE POLICY "media_persons_select" ON media_persons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM media m
      WHERE m.id = media_persons.media_id
        AND public.has_family_role(m.family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
    )
  );

CREATE POLICY "media_persons_insert" ON media_persons
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM media m
      WHERE m.id = media_persons.media_id
        AND public.has_family_role(m.family_id, ARRAY['owner', 'editor', 'contributor'])
    )
  );

CREATE POLICY "media_persons_delete" ON media_persons
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM media m
      WHERE m.id = media_persons.media_id
        AND public.has_family_role(m.family_id, ARRAY['owner', 'editor', 'contributor'])
    )
  );

-- [documents]
CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']));

CREATE POLICY "documents_insert" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']));

CREATE POLICY "documents_update" ON documents
  FOR UPDATE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']))
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor']));

CREATE POLICY "documents_delete" ON documents
  FOR DELETE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']));

-- ── 6. Storage Buckets & Strict Storage RLS ───────────────────

-- Ensure buckets are strictly private
UPDATE storage.buckets SET public = false WHERE id IN ('family-photos', 'family-documents');

-- Storage Select: Verified family member
CREATE POLICY "storage_family_photos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'family-photos' AND
    public.has_family_role(public.extract_storage_family_id(name), ARRAY['owner', 'editor', 'contributor', 'viewer'])
  );

CREATE POLICY "storage_family_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'family-documents' AND
    public.has_family_role(public.extract_storage_family_id(name), ARRAY['owner', 'editor', 'contributor', 'viewer'])
  );

-- Storage Insert: Owner, Editor, Contributor
CREATE POLICY "storage_family_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'family-photos' AND
    public.has_family_role(public.extract_storage_family_id(name), ARRAY['owner', 'editor', 'contributor'])
  );

CREATE POLICY "storage_family_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'family-documents' AND
    public.has_family_role(public.extract_storage_family_id(name), ARRAY['owner', 'editor', 'contributor'])
  );

-- Storage Update & Delete: Owner & Editor only
CREATE POLICY "storage_family_photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'family-photos' AND
    public.has_family_role(public.extract_storage_family_id(name), ARRAY['owner', 'editor'])
  );

CREATE POLICY "storage_family_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'family-photos' AND
    public.has_family_role(public.extract_storage_family_id(name), ARRAY['owner', 'editor'])
  );

CREATE POLICY "storage_family_documents_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'family-documents' AND
    public.has_family_role(public.extract_storage_family_id(name), ARRAY['owner', 'editor'])
  );

CREATE POLICY "storage_family_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'family-documents' AND
    public.has_family_role(public.extract_storage_family_id(name), ARRAY['owner', 'editor'])
  );
