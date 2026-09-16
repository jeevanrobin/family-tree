-- ============================================================
-- Medida's Family — Membership Security Hardening (M3F)
-- ============================================================

-- 1. Replace insecure insert policy with secure variant
DROP POLICY IF EXISTS "memberships_insert_owner_or_initial" ON family_memberships;
CREATE POLICY "memberships_insert_owner_or_initial_secure" ON family_memberships
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Allow initial owner insert ONLY if family has zero existing memberships
        (
            user_id = auth.uid() AND
            NOT EXISTS (
                SELECT 1 FROM family_memberships WHERE family_id = family_memberships.family_id
            )
        )
        OR
        -- Allow existing owners to add members
        public.has_family_role(family_id, ARRAY['owner'])
    );

-- 2. Add explicit comment explaining the security intent
COMMENT ON POLICY "memberships_insert_owner_or_initial_secure" ON family_memberships IS
    'Prevents arbitrary self-enrollment. Only allows: (1) first user to create membership in new family (becomes owner), (2) existing owners to add members. Invitations handled via accept_family_invitation RPC.';
