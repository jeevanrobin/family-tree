-- ============================================================
-- 013: Private family members
--
-- A person marked privacy = 'private' shows to viewers and contributors
-- by name only: name, gender, living status and photo, so the tree still
-- connects. Their dates, places, occupation, biography and notes, and the
-- stories, life events, photos and documents about them, are visible only
-- to the family's owners and editors.
--
-- Enforced here, not only in the app: viewers cannot read a private row
-- from family_members at all; they get the masked copy from
-- family_members_visible(). Change-log entries about a private person are
-- hidden from them too.
-- ============================================================

-- Owners and editors see private details.
CREATE OR REPLACE FUNCTION public.can_see_private(check_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_family_role(check_family_id, ARRAY['owner', 'editor']);
$$;

-- Is this person private? (SECURITY DEFINER: callable from other policies
-- without tripping family_members' own row security.)
CREATE OR REPLACE FUNCTION public.is_private_member(check_person_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members WHERE id = check_person_id AND privacy = 'private'
  );
$$;

-- Does a story / life event / photo involve a private person (main person
-- or any linked person)? SECURITY DEFINER so the check does not re-enter
-- the junction tables' policies (which themselves look at the parent row).
CREATE OR REPLACE FUNCTION public.involves_private_member(kind TEXT, item_id UUID, main_person UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_private_member(main_person)
    OR (kind = 'story' AND EXISTS (
          SELECT 1 FROM story_persons sp
          JOIN family_members m ON m.id = sp.person_id
          WHERE sp.story_id = item_id AND m.privacy = 'private'))
    OR (kind = 'event' AND EXISTS (
          SELECT 1 FROM life_event_persons ep
          JOIN family_members m ON m.id = ep.person_id
          WHERE ep.life_event_id = item_id AND m.privacy = 'private'))
    OR (kind = 'media' AND EXISTS (
          SELECT 1 FROM media_persons mp
          JOIN family_members m ON m.id = mp.person_id
          WHERE mp.media_id = item_id AND m.privacy = 'private'));
$$;

-- ── family_members: private rows only for owners/editors ────────────
DROP POLICY IF EXISTS "family_members_select" ON family_members;
CREATE POLICY "family_members_select" ON family_members
  FOR SELECT TO authenticated
  USING (
    public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
    AND (privacy <> 'private' OR public.can_see_private(family_id))
  );

-- Everyone in the family, with private people's details blanked for
-- viewers and contributors. The app loads people through this.
CREATE OR REPLACE FUNCTION public.family_members_visible(check_family_id UUID)
RETURNS SETOF family_members
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full BOOLEAN := public.can_see_private(check_family_id);
BEGIN
  IF NOT public.has_family_role(check_family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id, m.family_id, m.local_id, m.first_name, m.middle_name, m.last_name, m.display_name,
    m.gender, m.living_status,
    CASE WHEN hide THEN NULL ELSE m.date_of_birth END,
    CASE WHEN hide THEN NULL ELSE m.date_of_death END,
    CASE WHEN hide THEN '' ELSE m.place_of_birth END,
    CASE WHEN hide THEN '' ELSE m.hometown END,
    CASE WHEN hide THEN '' ELSE m.current_location END,
    CASE WHEN hide THEN '' ELSE m.occupation END,
    m.photo_url,
    CASE WHEN hide THEN '' ELSE m.biography END,
    CASE WHEN hide THEN '' ELSE m.notes END,
    m.privacy, m.created_at, m.updated_at
  FROM (
    SELECT f.*, (f.privacy = 'private' AND NOT v_full) AS hide
    FROM family_members f
    WHERE f.family_id = check_family_id
  ) m;
END;
$$;

GRANT EXECUTE ON FUNCTION public.family_members_visible(UUID) TO authenticated;

-- ── Content about a private person: owners/editors only ─────────────
DROP POLICY IF EXISTS "stories_select" ON stories;
CREATE POLICY "stories_select" ON stories
  FOR SELECT TO authenticated
  USING (
    public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
    AND (
      public.can_see_private(family_id)
      OR NOT public.involves_private_member('story', stories.id, stories.person_id)
    )
  );

DROP POLICY IF EXISTS "life_events_select" ON life_events;
CREATE POLICY "life_events_select" ON life_events
  FOR SELECT TO authenticated
  USING (
    public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
    AND (
      public.can_see_private(family_id)
      OR NOT public.involves_private_member('event', life_events.id, life_events.person_id)
    )
  );

DROP POLICY IF EXISTS "media_select" ON media;
CREATE POLICY "media_select" ON media
  FOR SELECT TO authenticated
  USING (
    public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
    AND (
      public.can_see_private(family_id)
      OR NOT public.involves_private_member('media', media.id, media.person_id)
    )
  );

DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated
  USING (
    public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
    AND (public.can_see_private(family_id) OR NOT public.is_private_member(person_id))
  );

-- ── Change history: entries about a private person ──────────────────
DROP POLICY IF EXISTS "family_change_log_select" ON public.family_change_log;
CREATE POLICY "family_change_log_select" ON public.family_change_log
  FOR SELECT TO authenticated
  USING (
    public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
    AND (
      public.can_see_private(family_id)
      OR NOT (
        (table_name = 'family_members' AND (
          public.is_private_member(row_id)
          OR COALESCE(new_data ->> 'privacy', old_data ->> 'privacy') = 'private'
        ))
        OR (table_name = 'relationships' AND (
          public.is_private_member(COALESCE((new_data ->> 'person_id_1')::UUID, (old_data ->> 'person_id_1')::UUID))
          OR public.is_private_member(COALESCE((new_data ->> 'person_id_2')::UUID, (old_data ->> 'person_id_2')::UUID))
        ))
      )
    )
  );
