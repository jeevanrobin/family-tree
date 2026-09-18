-- ============================================================
-- Medida's Family — Family Collaboration & Invitations (M3E)
--
-- Supported Collaboration Features:
--   - Family invitations with secure SHA-256 token hashing
--   - Atomic invitation acceptance with replay prevention
--   - Family member roster listing with verified details
--   - Dynamic member role management (Owner only)
--   - Safe member removal (preventing owner abandonment)
--   - Atomic ownership transfer (strictly preserving 1-owner invariant)
--   - Multi-tenant family boundary isolation
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Family Invitations Table ─────────────────────────────

CREATE TABLE IF NOT EXISTS family_invitations (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('editor', 'contributor', 'viewer')),
  invited_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at      TIMESTAMPTZ NOT NULL,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_invitations_family ON family_invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON family_invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_invitations_status ON family_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON family_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON family_invitations(token_hash);

-- Enforce at most ONE active pending invitation per email per family
CREATE UNIQUE INDEX IF NOT EXISTS uq_family_invitations_pending
  ON family_invitations (family_id, lower(email))
  WHERE status = 'pending';

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_invitations ON family_invitations;
CREATE TRIGGER set_updated_at_invitations BEFORE UPDATE ON family_invitations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── 2. Row Level Security for Collaborations ─────────────────

ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;

-- Allow family owners to view all invitations for their family
-- Also allow invited users to view invitations addressed to their authenticated email
CREATE POLICY "invitations_select" ON family_invitations
  FOR SELECT TO authenticated
  USING (
    public.has_family_role(family_id, ARRAY['owner']) OR
    lower(email) = lower(auth.jwt() ->> 'email')
  );

CREATE POLICY "invitations_insert_owner" ON family_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner']));

CREATE POLICY "invitations_update_owner" ON family_invitations
  FOR UPDATE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner']))
  WITH CHECK (public.has_family_role(family_id, ARRAY['owner']));

CREATE POLICY "invitations_delete_owner" ON family_invitations
  FOR DELETE TO authenticated
  USING (public.has_family_role(family_id, ARRAY['owner']));

-- Update family_memberships SELECT policy so all verified members can view the member roster
DROP POLICY IF EXISTS "memberships_select_self_or_owner" ON family_memberships;
CREATE POLICY "memberships_select_family_members" ON family_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_family_role(family_id, ARRAY['owner', 'editor', 'contributor', 'viewer'])
  );

-- ── 3. Security Definer RPCs ─────────────────────────────────

-- [A] Get Family Members Roster with user details
CREATE OR REPLACE FUNCTION public.get_family_members(target_family_id UUID)
RETURNS TABLE (
  membership_id UUID,
  family_id UUID,
  user_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  email TEXT,
  display_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Strict caller verification: must be an active member of this family
  IF NOT public.has_family_role(target_family_id, ARRAY['owner', 'editor', 'contributor', 'viewer']) THEN
    RAISE EXCEPTION 'Access denied: not an active member of this family.';
  END IF;

  RETURN QUERY
  SELECT
    fm.id AS membership_id,
    fm.family_id,
    fm.user_id,
    fm.role,
    fm.created_at,
    u.email::TEXT,
    COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))::TEXT AS display_name
  FROM public.family_memberships fm
  JOIN auth.users u ON u.id = fm.user_id
  WHERE fm.family_id = target_family_id
  ORDER BY
    CASE fm.role
      WHEN 'owner' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'contributor' THEN 3
      WHEN 'viewer' THEN 4
      ELSE 5
    END,
    fm.created_at ASC;
END;
$$;

-- [B] Create Family Invitation
CREATE OR REPLACE FUNCTION public.create_family_invitation(
  p_family_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_token_hash TEXT,
  p_duration_days INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_existing_user_id UUID;
  v_existing_member RECORD;
  v_invite_id UUID;
  v_expires_at TIMESTAMPTZ := now() + (p_duration_days || ' days')::INTERVAL;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Verify caller is Owner of target family
  SELECT role INTO v_caller_role
  FROM family_memberships
  WHERE family_id = p_family_id AND user_id = v_caller_id;

  IF v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the family owner can invite new members.';
  END IF;

  IF p_role NOT IN ('editor', 'contributor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role. Cannot invite someone as owner.';
  END IF;

  -- Check if recipient is already a member of the family
  SELECT u.id INTO v_existing_user_id FROM auth.users u WHERE lower(u.email) = lower(trim(p_email)) LIMIT 1;
  IF v_existing_user_id IS NOT NULL THEN
    SELECT * INTO v_existing_member
    FROM family_memberships
    WHERE family_id = p_family_id AND user_id = v_existing_user_id;

    IF v_existing_member.id IS NOT NULL THEN
      RAISE EXCEPTION 'User is already a member of this family (role: %).', v_existing_member.role;
    END IF;
  END IF;

  -- Revoke any previous pending invitation for this email in this family
  UPDATE family_invitations
  SET status = 'revoked', updated_at = now()
  WHERE family_id = p_family_id AND lower(email) = lower(trim(p_email)) AND status = 'pending';

  -- Insert new invitation
  INSERT INTO family_invitations (
    family_id,
    email,
    role,
    invited_by,
    token_hash,
    status,
    expires_at
  ) VALUES (
    p_family_id,
    lower(trim(p_email)),
    p_role,
    v_caller_id,
    p_token_hash,
    'pending',
    v_expires_at
  )
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_invite_id,
    'family_id', p_family_id,
    'email', lower(trim(p_email)),
    'role', p_role,
    'expires_at', v_expires_at
  );
END;
$$;

-- [C] Revoke Family Invitation
CREATE OR REPLACE FUNCTION public.revoke_family_invitation(
  p_invitation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_invite RECORD;
  v_caller_role TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_invite FROM family_invitations WHERE id = p_invitation_id;
  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found.';
  END IF;

  SELECT role INTO v_caller_role
  FROM family_memberships
  WHERE family_id = v_invite.family_id AND user_id = v_caller_id;

  IF v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the family owner can revoke invitations.';
  END IF;

  UPDATE family_invitations
  SET status = 'revoked', updated_at = now()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object('success', true, 'id', p_invitation_id);
END;
$$;

-- [D] Get Family Invitations List (Owner only; omits token hashes)
CREATE OR REPLACE FUNCTION public.get_family_invitations(p_family_id UUID)
RETURNS TABLE (
  id UUID,
  family_id UUID,
  email TEXT,
  role TEXT,
  invited_by UUID,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  inviter_email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_family_role(p_family_id, ARRAY['owner']) THEN
    RAISE EXCEPTION 'Only the family owner can view family invitations.';
  END IF;

  -- Lazily mark expired invites
  UPDATE family_invitations
  SET status = 'expired', updated_at = now()
  WHERE family_id = p_family_id AND status = 'pending' AND expires_at < now();

  RETURN QUERY
  SELECT
    fi.id,
    fi.family_id,
    fi.email,
    fi.role,
    fi.invited_by,
    fi.status,
    fi.expires_at,
    fi.created_at,
    u.email::TEXT AS inviter_email
  FROM family_invitations fi
  LEFT JOIN auth.users u ON u.id = fi.invited_by
  WHERE fi.family_id = p_family_id
  ORDER BY fi.created_at DESC;
END;
$$;

-- [E] Get Invitation Details by Token Hash (Public verification for invite acceptance screen)
CREATE OR REPLACE FUNCTION public.get_invitation_details(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invite RECORD;
  v_family_name TEXT;
  v_inviter_name TEXT;
BEGIN
  SELECT fi.*, f.name AS family_name, u.email AS inviter_email
  INTO v_invite
  FROM family_invitations fi
  JOIN families f ON f.id = fi.family_id
  LEFT JOIN auth.users u ON u.id = fi.invited_by
  WHERE fi.token_hash = p_token_hash;

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invitation not found or invalid token.');
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN jsonb_build_object('valid', false, 'status', 'accepted', 'error', 'This invitation has already been accepted.');
  ELSIF v_invite.status = 'revoked' THEN
    RETURN jsonb_build_object('valid', false, 'status', 'revoked', 'error', 'This invitation has been revoked by the family owner.');
  ELSIF v_invite.status = 'expired' OR v_invite.expires_at < now() THEN
    UPDATE family_invitations SET status = 'expired', updated_at = now() WHERE id = v_invite.id;
    RETURN jsonb_build_object('valid', false, 'status', 'expired', 'error', 'This invitation has expired.');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', v_invite.id,
    'family_id', v_invite.family_id,
    'family_name', v_invite.family_name,
    'email', v_invite.email,
    'role', v_invite.role,
    'inviter_email', v_invite.inviter_email,
    'expires_at', v_invite.expires_at
  );
END;
$$;

-- [F] Accept Family Invitation (Atomic Membership Creation & Replay Prevention)
CREATE OR REPLACE FUNCTION public.accept_family_invitation(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_invite RECORD;
  v_existing_membership RECORD;
BEGIN
  -- 1. Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to accept an invitation.';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- 2. Lock invitation row FOR UPDATE to prevent race conditions & replay
  SELECT * INTO v_invite
  FROM family_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation or token not found.';
  END IF;

  -- 3. Check status
  IF v_invite.status = 'accepted' THEN
    RAISE EXCEPTION 'This invitation has already been accepted.';
  ELSIF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'This invitation has been revoked.';
  ELSIF v_invite.status = 'expired' OR v_invite.expires_at < now() THEN
    UPDATE family_invitations SET status = 'expired', updated_at = now() WHERE id = v_invite.id;
    RAISE EXCEPTION 'This invitation has expired.';
  END IF;

  -- 4. Verify recipient identity
  IF lower(trim(v_invite.email)) <> lower(trim(v_user_email)) THEN
    RAISE EXCEPTION 'This invitation was addressed to % but you are signed in as %.', v_invite.email, v_user_email;
  END IF;

  -- 5. Check if user is already a member
  SELECT * INTO v_existing_membership
  FROM family_memberships
  WHERE family_id = v_invite.family_id AND user_id = v_user_id;

  IF v_existing_membership.id IS NOT NULL THEN
    UPDATE family_invitations
    SET status = 'accepted', accepted_at = now(), updated_at = now()
    WHERE id = v_invite.id;

    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'family_id', v_invite.family_id,
      'role', v_existing_membership.role
    );
  END IF;

  -- 6. Insert new membership and mark invitation accepted atomically
  INSERT INTO family_memberships (family_id, user_id, role)
  VALUES (v_invite.family_id, v_user_id, v_invite.role);

  UPDATE family_invitations
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'family_id', v_invite.family_id,
    'role', v_invite.role
  );
END;
$$;

-- [G] Update Member Role (Owner only)
CREATE OR REPLACE FUNCTION public.update_member_role(
  p_family_id UUID,
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_new_role NOT IN ('editor', 'contributor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role. Use transfer_family_ownership to reassign the owner role.';
  END IF;

  SELECT role INTO v_caller_role
  FROM family_memberships
  WHERE family_id = p_family_id AND user_id = v_caller_id;

  IF v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the family owner can change member roles.';
  END IF;

  SELECT role INTO v_target_role
  FROM family_memberships
  WHERE family_id = p_family_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this family.';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot demote the family owner directly. Use transfer_family_ownership.';
  END IF;

  UPDATE family_memberships
  SET role = p_new_role, updated_at = now()
  WHERE family_id = p_family_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'new_role', p_new_role);
END;
$$;

-- [H] Remove Member (Owner or Self; Owner cannot abandon without transfer)
CREATE OR REPLACE FUNCTION public.remove_family_member(
  p_family_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT role INTO v_caller_role
  FROM family_memberships
  WHERE family_id = p_family_id AND user_id = v_caller_id;

  SELECT role INTO v_target_role
  FROM family_memberships
  WHERE family_id = p_family_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this family.';
  END IF;

  -- Self removal (leaving family)
  IF v_caller_id = p_user_id THEN
    IF v_target_role = 'owner' THEN
      RAISE EXCEPTION 'The family owner cannot leave the family without transferring ownership first.';
    END IF;
  ELSE
    -- Removing another user requires Owner role
    IF v_caller_role <> 'owner' THEN
      RAISE EXCEPTION 'Only the family owner can remove members.';
    END IF;
    IF v_target_role = 'owner' THEN
      RAISE EXCEPTION 'Cannot remove the family owner.';
    END IF;
  END IF;

  DELETE FROM family_memberships
  WHERE family_id = p_family_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'removed_user_id', p_user_id);
END;
$$;

-- [I] Atomic Ownership Transfer (Strict 1-Owner Invariant)
CREATE OR REPLACE FUNCTION public.transfer_family_ownership(
  p_family_id UUID,
  p_new_owner_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 1. Caller must be the current owner
  SELECT role INTO v_caller_role
  FROM family_memberships
  WHERE family_id = p_family_id AND user_id = v_caller_id;

  IF v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Access denied: only the current family owner can transfer ownership.';
  END IF;

  -- 2. Cannot transfer to self
  IF v_caller_id = p_new_owner_user_id THEN
    RAISE EXCEPTION 'Target user is already the owner.';
  END IF;

  -- 3. Target user must be an active member of this family
  SELECT role INTO v_target_role
  FROM family_memberships
  WHERE family_id = p_family_id AND user_id = p_new_owner_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not an active member of this family.';
  END IF;

  -- 4. Atomic transaction: promote target to owner, demote caller to editor
  UPDATE family_memberships
  SET role = 'owner', updated_at = now()
  WHERE family_id = p_family_id AND user_id = p_new_owner_user_id;

  UPDATE family_memberships
  SET role = 'editor', updated_at = now()
  WHERE family_id = p_family_id AND user_id = v_caller_id;

  -- Update family created_by pointer
  UPDATE families
  SET created_by = p_new_owner_user_id, updated_at = now()
  WHERE id = p_family_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ownership transferred successfully.',
    'family_id', p_family_id,
    'new_owner_id', p_new_owner_user_id,
    'previous_owner_id', v_caller_id
  );
END;
$$;
