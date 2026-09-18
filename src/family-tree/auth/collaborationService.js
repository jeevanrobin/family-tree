/**
 * Family Collaboration Service — Medida's Family (Milestone 3E)
 *
 * Encapsulates all family collaboration operations:
 * - Secure cryptographically-hashed family invitations (SHA-256)
 * - Atomic invitation acceptance with replay prevention
 * - Member roster listing with verified auth identities
 * - Dynamic role assignment (Owner only)
 * - Member removal (preventing owner abandonment)
 * - Atomic ownership transfer (guaranteeing 1-owner invariant)
 * - In-memory local fallback for tests & local development
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { invitationEmailService } from './invitationEmailService.js';
import { ROLES, isValidRole } from './roles.js';

/**
 * Computes SHA-256 hash of an invitation token.
 * Works seamlessly in both browser (Web Crypto API) and Node.js testing environments.
 * @param {string} token
 * @returns {Promise<string>}
 */
export async function hashToken(token) {
  if (!token || typeof token !== 'string') return '';

  // 1. Browser Web Crypto API (Primary runtime)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // 2. Node.js environment (for automated tests)
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const moduleName = 'node:crypto';
      const nodeCrypto = await import(/* @vite-ignore */ moduleName);
      return nodeCrypto.createHash('sha256').update(token).digest('hex');
    } catch {
      // Continue to deterministic fallback
    }
  }

  // Deterministic fallback if Web Crypto is unavailable
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Generates a high-entropy random token for invitations.
 * @returns {string}
 */
export function generateInvitationToken() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now()}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
}

class CollaborationService {
  constructor() {
    // In-memory mocks for local mode / test environments
    this.localInvitations = new Map();
    this.localMembers = new Map();
  }

  // ── 1. Invitations ──────────────────────────────────────────

  /**
   * Creates a new family invitation and dispatches invitation notification.
   */
  async createInvitation({ familyId, email, role, durationDays = 7, familyName = 'Your Family Tree' }) {
    if (!familyId) throw new Error('familyId is required.');
    if (!email || !email.includes('@')) throw new Error('A valid email address is required.');

    const cleanRole = (role || '').toLowerCase();
    if (!isValidRole(cleanRole) || cleanRole === ROLES.OWNER) {
      throw new Error('Invalid invitation role. Cannot invite someone as owner.');
    }

    const rawToken = generateInvitationToken();
    const tokenHash = await hashToken(rawToken);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('create_family_invitation', {
        p_family_id: familyId,
        p_email: email.trim().toLowerCase(),
        p_role: cleanRole,
        p_token_hash: tokenHash,
        p_duration_days: durationDays,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Dispatch invitation email via secure delivery boundary
      const emailResult = await invitationEmailService.sendInvitationEmail({
        email: email.trim().toLowerCase(),
        familyName,
        role: cleanRole,
        rawToken,
        expiresAt: data?.expires_at,
      });

      return {
        success: true,
        invitation: data,
        rawToken,
        inviteUrl: emailResult.inviteUrl,
      };
    }

    // Local / In-memory fallback
    const mockInvite = {
      id: `inv-${Date.now()}`,
      family_id: familyId,
      email: email.trim().toLowerCase(),
      role: cleanRole,
      status: 'pending',
      expires_at: new Date(Date.now() + durationDays * 86400 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      token_hash: tokenHash,
    };

    const familyInvites = this.localInvitations.get(familyId) || [];
    familyInvites.push(mockInvite);
    this.localInvitations.set(familyId, familyInvites);

    const emailResult = await invitationEmailService.sendInvitationEmail({
      email: mockInvite.email,
      familyName,
      role: cleanRole,
      rawToken,
      expiresAt: mockInvite.expires_at,
    });

    return {
      success: true,
      invitation: mockInvite,
      rawToken,
      inviteUrl: emailResult.inviteUrl,
    };
  }

  /**
   * Retrieves pending and past invitations for a family (Owner only).
   */
  async getFamilyInvitations(familyId) {
    if (!familyId) return [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('get_family_invitations', {
        p_family_id: familyId,
      });

      if (error) {
        console.warn('Failed to load family invitations:', error.message);
        return [];
      }
      return data || [];
    }

    // Local mode fallback
    return (this.localInvitations.get(familyId) || []).map(({ token_hash: _token_hash, ...rest }) => rest);
  }

  /**
   * Revokes an existing invitation.
   */
  async revokeInvitation(invitationId, familyId) {
    if (!invitationId) throw new Error('invitationId is required.');

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('revoke_family_invitation', {
        p_invitation_id: invitationId,
      });

      if (error) throw new Error(error.message);
      return data;
    }

    // Local mode fallback
    if (familyId && this.localInvitations.has(familyId)) {
      const list = this.localInvitations.get(familyId);
      const target = list.find((i) => i.id === invitationId);
      if (target) target.status = 'revoked';
    }
    return { success: true, id: invitationId };
  }

  /**
   * Retrieves invitation details by raw token for acceptance verification.
   */
  async getInvitationDetails(rawToken) {
    if (!rawToken) return { valid: false, error: 'No invitation token provided.' };

    const tokenHash = await hashToken(rawToken);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('get_invitation_details', {
        p_token_hash: tokenHash,
      });

      if (error) {
        return { valid: false, error: error.message };
      }
      return data || { valid: false, error: 'Invitation not found.' };
    }

    // Local mode fallback
    for (const [_, invites] of this.localInvitations.entries()) {
      const found = invites.find((i) => i.token_hash === tokenHash);
      if (found) {
        if (found.status !== 'pending') {
          return { valid: false, status: found.status, error: `Invitation is ${found.status}.` };
        }
        return {
          valid: true,
          id: found.id,
          family_id: found.family_id,
          family_name: 'Your Family Tree',
          email: found.email,
          role: found.role,
          expires_at: found.expires_at,
        };
      }
    }
    return { valid: false, error: 'Invitation not found.' };
  }

  /**
   * Accepts a family invitation atomically.
   */
  async acceptInvitation(rawToken) {
    if (!rawToken) throw new Error('No invitation token provided.');

    const tokenHash = await hashToken(rawToken);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('accept_family_invitation', {
        p_token_hash: tokenHash,
      });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }

    // Local mode fallback
    for (const [fid, invites] of this.localInvitations.entries()) {
      const found = invites.find((i) => i.token_hash === tokenHash);
      if (found) {
        if (found.status === 'accepted') {
          throw new Error('This invitation has already been accepted.');
        }
        if (found.status === 'revoked') {
          throw new Error('This invitation has been revoked.');
        }
        found.status = 'accepted';
        return { success: true, family_id: fid, role: found.role };
      }
    }
    throw new Error('Invalid or expired invitation token.');
  }

  // ── 2. Members & Roles ──────────────────────────────────────

  /**
   * Retrieves the verified member roster for a family.
   */
  async getFamilyMembers(familyId) {
    if (!familyId) return [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('get_family_members', {
        target_family_id: familyId,
      });

      if (error) {
        console.warn('Failed to load family members:', error.message);
        return [];
      }
      return data || [];
    }

    // Local mode fallback
    return (
      this.localMembers.get(familyId) || [
        {
          membership_id: 'mem-1',
          family_id: familyId,
          user_id: 'user-local-owner',
          role: 'owner',
          email: 'family.admin@medida.org',
          display_name: 'Family Administrator',
          created_at: new Date().toISOString(),
        },
      ]
    );
  }

  /**
   * Updates a member's role (Owner only).
   */
  async updateMemberRole(familyId, userId, newRole) {
    if (!familyId || !userId || !newRole) {
      throw new Error('familyId, userId, and newRole are required.');
    }

    const cleanRole = newRole.toLowerCase();
    if (!isValidRole(cleanRole) || cleanRole === ROLES.OWNER) {
      throw new Error('Invalid role assignment. Use transferOwnership to assign owner.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('update_member_role', {
        p_family_id: familyId,
        p_user_id: userId,
        p_new_role: cleanRole,
      });

      if (error) throw new Error(error.message);
      return data;
    }

    // Local mode fallback
    const members = this.localMembers.get(familyId) || [];
    const target = members.find((m) => m.user_id === userId);
    if (target) target.role = cleanRole;
    return { success: true, user_id: userId, new_role: cleanRole };
  }

  /**
   * Removes a member from the family (Owner or self).
   */
  async removeMember(familyId, userId) {
    if (!familyId || !userId) {
      throw new Error('familyId and userId are required.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('remove_family_member', {
        p_family_id: familyId,
        p_user_id: userId,
      });

      if (error) throw new Error(error.message);
      return data;
    }

    // Local mode fallback
    const members = this.localMembers.get(familyId) || [];
    this.localMembers.set(
      familyId,
      members.filter((m) => m.user_id !== userId)
    );
    return { success: true, removed_user_id: userId };
  }

  /**
   * Atomically transfers family ownership to another member.
   */
  async transferOwnership(familyId, newOwnerUserId) {
    if (!familyId || !newOwnerUserId) {
      throw new Error('familyId and newOwnerUserId are required.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('transfer_family_ownership', {
        p_family_id: familyId,
        p_new_owner_user_id: newOwnerUserId,
      });

      if (error) throw new Error(error.message);
      return data;
    }

    // Local mode fallback
    const members = this.localMembers.get(familyId) || [];
    members.forEach((m) => {
      if (m.user_id === newOwnerUserId) m.role = 'owner';
      else if (m.role === 'owner') m.role = 'editor';
    });
    return {
      success: true,
      family_id: familyId,
      new_owner_id: newOwnerUserId,
    };
  }
}

export const collaborationService = new CollaborationService();
export default collaborationService;
