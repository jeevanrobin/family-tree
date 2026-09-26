-- ============================================================
-- 011: Change history
--
-- Every insert, update and delete of family_members and relationships is
-- recorded by a trigger with the row before and after, who made it and
-- when. Written by the database itself, so it captures every family
-- member's edits from any device and cannot be skipped by a client.
-- Members can read their family's log; nobody can write to it directly.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.family_change_log (
  id               BIGSERIAL PRIMARY KEY,
  family_id        UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  table_name       TEXT NOT NULL CHECK (table_name IN ('family_members', 'relationships')),
  row_id           UUID NOT NULL,
  action           TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data         JSONB,
  new_data         JSONB,
  changed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name  TEXT,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_change_log_family_time
  ON public.family_change_log (family_id, changed_at DESC);

ALTER TABLE public.family_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_change_log_select" ON public.family_change_log;
CREATE POLICY "family_change_log_select" ON public.family_change_log
  FOR SELECT TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']));
-- No INSERT/UPDATE/DELETE policies: only the trigger below writes rows.

CREATE OR REPLACE FUNCTION public.log_family_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_old JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_new JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  v_family UUID := COALESCE((v_new ->> 'family_id')::UUID, (v_old ->> 'family_id')::UUID);
  v_name TEXT;
BEGIN
  -- Skip updates that change nothing but the timestamp.
  IF TG_OP = 'UPDATE' AND (v_old - 'updated_at') = (v_new - 'updated_at') THEN
    RETURN NULL;
  END IF;

  -- The family itself is being deleted: its log goes with it.
  IF NOT EXISTS (SELECT 1 FROM public.families WHERE id = v_family) THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1))
    INTO v_name
    FROM auth.users u
   WHERE u.id = auth.uid();

  INSERT INTO public.family_change_log (family_id, table_name, row_id, action, old_data, new_data, changed_by, changed_by_name)
  VALUES (v_family, TG_TABLE_NAME, COALESCE((v_new ->> 'id')::UUID, (v_old ->> 'id')::UUID), TG_OP, v_old, v_new, auth.uid(), v_name);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_family_members ON public.family_members;
CREATE TRIGGER trg_log_family_members
  AFTER INSERT OR UPDATE OR DELETE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.log_family_change();

DROP TRIGGER IF EXISTS trg_log_relationships ON public.relationships;
CREATE TRIGGER trg_log_relationships
  AFTER INSERT OR UPDATE OR DELETE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.log_family_change();
