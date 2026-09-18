-- ============================================================
-- Medida's Family — Cloud-Authoritative Sibling Orders (M3G)
--
-- Persists manual sibling cohort arrangement authoritatively
-- in Supabase while preserving family-level isolation and RLS.
-- ============================================================

-- ── 1. Table: family_sibling_orders ──────────────────────────

CREATE TABLE IF NOT EXISTS public.family_sibling_orders (
  family_id          UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  cohort_key         TEXT NOT NULL,
  ordered_person_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT pk_family_sibling_orders PRIMARY KEY (family_id, cohort_key),
  CONSTRAINT chk_cohort_key_not_empty CHECK (btrim(cohort_key) <> '')
);

-- Index for efficient family lookup
CREATE INDEX IF NOT EXISTS idx_family_sibling_orders_family
  ON public.family_sibling_orders(family_id);

-- Auto-update updated_at timestamp on record modification
DROP TRIGGER IF EXISTS set_updated_at_sibling_orders ON public.family_sibling_orders;
CREATE TRIGGER set_updated_at_sibling_orders
  BEFORE UPDATE ON public.family_sibling_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── 2. Row Level Security ────────────────────────────────────

ALTER TABLE public.family_sibling_orders ENABLE ROW LEVEL SECURITY;

-- SELECT: Any authenticated member of the family (owner, editor, contributor, viewer)
DROP POLICY IF EXISTS "family_sibling_orders_select" ON public.family_sibling_orders;
CREATE POLICY "family_sibling_orders_select" ON public.family_sibling_orders
  FOR SELECT TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']));

-- INSERT: Owner or Editor only
DROP POLICY IF EXISTS "family_sibling_orders_insert" ON public.family_sibling_orders;
CREATE POLICY "family_sibling_orders_insert" ON public.family_sibling_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor']));

-- UPDATE: Owner or Editor only
DROP POLICY IF EXISTS "family_sibling_orders_update" ON public.family_sibling_orders;
CREATE POLICY "family_sibling_orders_update" ON public.family_sibling_orders
  FOR UPDATE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']))
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner', 'editor']));

-- DELETE: Owner or Editor only
DROP POLICY IF EXISTS "family_sibling_orders_delete" ON public.family_sibling_orders;
CREATE POLICY "family_sibling_orders_delete" ON public.family_sibling_orders
  FOR DELETE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner', 'editor']));

-- ── 3. Validated RPC: save_family_sibling_order ──────────────

CREATE OR REPLACE FUNCTION public.save_family_sibling_order(
  p_family_id UUID,
  p_cohort_key TEXT,
  p_ordered_person_ids JSONB
)
RETURNS public.family_sibling_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_trimmed_cohort TEXT := btrim(COALESCE(p_cohort_key, ''));
  v_row public.family_sibling_orders%ROWTYPE;
  v_total_ids INT;
  v_distinct_ids INT;
  v_matched_members INT;
BEGIN
  -- 1. Authorization check: caller must be authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 2. Role check: caller must have owner or editor role in target family
  IF NOT public.has_family_role(p_family_id, ARRAY['owner', 'editor']) THEN
    RAISE EXCEPTION 'Forbidden: Only family owners or editors can modify sibling ordering.';
  END IF;

  -- 3. Validate cohort key
  IF v_trimmed_cohort = '' THEN
    RAISE EXCEPTION 'Cohort key cannot be empty.';
  END IF;

  IF length(v_trimmed_cohort) > 200 THEN
    RAISE EXCEPTION 'Cohort key exceeds maximum allowed length (200 characters).';
  END IF;

  -- 4. Validate ordered_person_ids is a JSON array
  IF jsonb_typeof(p_ordered_person_ids) <> 'array' THEN
    RAISE EXCEPTION 'ordered_person_ids must be a valid JSON array.';
  END IF;

  v_total_ids := jsonb_array_length(p_ordered_person_ids);

  -- 5. If array has items, validate ID uniqueness and family membership
  IF v_total_ids > 0 THEN
    -- Check for duplicates inside the JSON array
    SELECT count(*), count(DISTINCT elem)
    INTO v_total_ids, v_distinct_ids
    FROM jsonb_array_elements_text(p_ordered_person_ids) AS elem;

    IF v_total_ids <> v_distinct_ids THEN
      RAISE EXCEPTION 'Duplicate person IDs detected in sibling order array.';
    END IF;

    -- Verify all IDs exist in family_members belonging to this family
    SELECT count(*)
    INTO v_matched_members
    FROM public.family_members
    WHERE family_id = p_family_id
      AND id::text IN (
        SELECT elem FROM jsonb_array_elements_text(p_ordered_person_ids) AS elem
      );

    IF v_matched_members <> v_total_ids THEN
      RAISE EXCEPTION 'Validation failed: One or more person IDs do not exist in family_members for family %.', p_family_id;
    END IF;
  END IF;

  -- 6. Upsert into family_sibling_orders
  INSERT INTO public.family_sibling_orders (
    family_id,
    cohort_key,
    ordered_person_ids,
    updated_at,
    updated_by
  )
  VALUES (
    p_family_id,
    v_trimmed_cohort,
    p_ordered_person_ids,
    now(),
    v_caller_id
  )
  ON CONFLICT (family_id, cohort_key)
  DO UPDATE SET
    ordered_person_ids = EXCLUDED.ordered_person_ids,
    updated_at = now(),
    updated_by = v_caller_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ── 4. Validated RPC: delete_family_sibling_order ────────────

CREATE OR REPLACE FUNCTION public.delete_family_sibling_order(
  p_family_id UUID,
  p_cohort_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_trimmed_cohort TEXT := btrim(COALESCE(p_cohort_key, ''));
BEGIN
  -- 1. Authorization check
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT public.has_family_role(p_family_id, ARRAY['owner', 'editor']) THEN
    RAISE EXCEPTION 'Forbidden: Only family owners or editors can delete sibling ordering.';
  END IF;

  DELETE FROM public.family_sibling_orders
  WHERE family_id = p_family_id AND cohort_key = v_trimmed_cohort;

  RETURN FOUND;
END;
$$;
