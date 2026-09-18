-- ============================================================
-- Medida's Family — Secure Atomic First-Family Creation (M3F)
-- ============================================================

-- Correct the first-membership bootstrap check so it is scoped to
-- the candidate family rather than comparing a column to itself.
DROP POLICY IF EXISTS "memberships_insert_owner_or_initial_secure" ON family_memberships;
CREATE POLICY "memberships_insert_owner_or_initial_secure" ON family_memberships
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            user_id = auth.uid()
            AND NOT EXISTS (
                SELECT 1
                FROM family_memberships AS existing_membership
                WHERE existing_membership.family_id = family_memberships.family_id
            )
        )
        OR public.has_family_role(family_id, ARRAY['owner'])
    );

-- Create a family and its initial owner membership as one transaction.
CREATE OR REPLACE FUNCTION public.create_family_with_owner(
    family_name TEXT,
    family_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    new_family families%ROWTYPE;
    normalized_name TEXT := btrim(family_name);
    normalized_description TEXT := NULLIF(btrim(COALESCE(family_description, '')), '');
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF normalized_name = '' THEN
        RAISE EXCEPTION 'Family name is required.';
    END IF;

    IF char_length(normalized_name) > 200 THEN
        RAISE EXCEPTION 'Family name must be 200 characters or fewer.';
    END IF;

    INSERT INTO public.families (name, description, created_by)
    VALUES (normalized_name, normalized_description, caller_id)
    RETURNING * INTO new_family;

    INSERT INTO public.family_memberships (family_id, user_id, role)
    VALUES (new_family.id, caller_id, 'owner');

    RETURN QUERY
    SELECT new_family.id, new_family.name, new_family.description, new_family.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_family_with_owner(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_family_with_owner(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_family_with_owner(TEXT, TEXT) TO authenticated;
