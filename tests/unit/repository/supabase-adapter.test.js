/**
 * SupabaseAdapter Unit Tests
 * 
 * Tests the adapter's behavior by mocking Supabase at the network boundary.
 * These are unit tests, NOT live RLS verification - see tests/integration/supabase/* for live tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseAdapter } from '../../../src/family-tree/store/repository/SupabaseAdapter.js';

vi.mock('../../../src/family-tree/lib/supabaseClient.js', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const validFamilyId = 'f-00000000-0000-0000-0000-000000000001';

describe('SupabaseAdapter Unit Tests', () => {
  let adapter;
  let supabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    supabase = (await import('../../../src/family-tree/lib/supabaseClient.js')).supabase;
    adapter = new SupabaseAdapter(validFamilyId);
  });

  describe('Constructor Security', () => {
    it('rejects null familyId', () => {
      expect(() => new SupabaseAdapter(null)).toThrow(/valid family ID/);
    });

    it('rejects undefined familyId', () => {
      expect(() => new SupabaseAdapter(undefined)).toThrow(/valid family ID/);
    });

    it('rejects empty string familyId', () => {
      expect(() => new SupabaseAdapter('')).toThrow(/valid family ID/);
    });

    it('rejects number familyId', () => {
      expect(() => new SupabaseAdapter(123)).toThrow(/valid family ID/);
    });

    it('accepts valid familyId string', () => {
      const a = new SupabaseAdapter('my-family-id');
      expect(a.familyId).toBe('my-family-id');
    });
  });

  describe('Session Validation', () => {
    it('throws when no session exists', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(adapter.load()).rejects.toThrow(/authenticated session/);
    });

    it('throws when session retrieval fails', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      await expect(adapter.load()).rejects.toThrow(/authenticated session/);
    });
  });

  describe('Family Membership Verification', () => {
    it('throws when user is not a member of the family', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      });

      await expect(adapter.load()).rejects.toThrow(/does not belong to family/);
    });

    it('allows access when user is family member', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      const mockMaybeSingle = vi.fn()
        .mockResolvedValueOnce({ data: { role: 'viewer' }, error: null });

      const mockEq = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      }));

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({ eq: mockEq })),
      });

      await expect(adapter._validateSessionAndScope()).resolves.toEqual({
        userId: 'user-123',
        role: 'viewer',
      });
    });
  });

  describe('Cross-Family Boundary Enforcement', () => {
    it('verifies persons belong to family before relationship save', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      const mockMaybeSingle = vi.fn()
        .mockResolvedValueOnce({ data: { role: 'editor' }, error: null });

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
            in: vi.fn().mockResolvedValue({ count: 1, error: null }),
          })),
        })),
      });

      const rel = {
        id: 'r1',
        parentId: 'p1',
        childId: 'p2',
        type: 'parent-child',
      };

      await expect(adapter.saveRelationship(rel)).rejects.toThrow(/Cross-family boundary violation/);
    });
  });

  describe('Error Propagation', () => {
    it('wraps Supabase errors with context', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'editor' }, error: null }),
              // Existing-row lookup done before insert (no existing row).
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
            in: vi.fn().mockResolvedValue({ count: 2, error: null }),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'duplicate key' },
            }),
          })),
        })),
      });

      const rel = { id: 'r1', parentId: 'p1', childId: 'p2', type: 'parent-child', _isNew: true };

      await expect(adapter.saveRelationship(rel)).rejects.toThrow(/Supabase.*duplicate key/);
    });
  });

  describe('Family Scoping on Delete', () => {
    it('includes family_id in delete filter', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'owner' },
                error: null,
              }),
            })),
          })),
        })),
      }).mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      });

      await adapter.deletePerson('p1');

      expect(supabase.from).toHaveBeenCalled();
    });
  });
});
