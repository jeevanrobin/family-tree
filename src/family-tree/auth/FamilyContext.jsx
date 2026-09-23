import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import familyStore from '../store/FamilyStore.js';
import { LocalAdapter } from '../store/repository/LocalAdapter.js';
import { createRepository, FAMILY_ID_KEY } from '../store/repository/index.js';
import { ROLES, canViewFamily } from './roles.js';

export const FamilyContext = createContext(null);

export function FamilyProvider({ children }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [activeFamily, setActiveFamily] = useState(null);
  const [currentRole, setCurrentRole] = useState(ROLES.VIEWER);
  const [loadingMemberships, setLoadingMemberships] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced');
  
  // Track which family has been initialized to prevent duplicate setRepository calls
  const initializedFamilyIdRef = useRef(null);

  // Fetch verified memberships directly from Supabase
  const loadUserMemberships = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setMemberships([]);
      setActiveFamily(null);
      setCurrentRole(ROLES.VIEWER);
      setLoadingMemberships(false);
      return [];
    }

    try {
      setLoadingMemberships(true);

      const { data, error } = await supabase
        .from('family_memberships')
        .select(`
          family_id,
          role,
          families (
            id,
            name,
            description,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to load family memberships:', error.message);
        setMemberships([]);
        setActiveFamily(null);
        return [];
      }

      const verified = (data || []).map((m) => ({
        familyId: m.family_id,
        role: m.role || ROLES.VIEWER,
        family: m.families || { id: m.family_id, name: "Family Tree", description: '' },
      }));

      setMemberships(verified);

      if (verified.length > 0) {
        // Resolve active family: check localStorage selector first, but ONLY accept if user is verified member
        const storedId = localStorage.getItem(FAMILY_ID_KEY);
        const matched = verified.find((m) => m.familyId === storedId);

        const chosen = matched || verified[0];
        
        // Only initialize repository once per family ID to prevent reload on tab focus
        if (chosen.familyId !== initializedFamilyIdRef.current) {
          initializedFamilyIdRef.current = chosen.familyId;
          setActiveFamily(chosen.family);
          setCurrentRole(chosen.role);
          localStorage.setItem(FAMILY_ID_KEY, chosen.familyId);

          // Configure FamilyStore with SyncAdapter (IndexedDB + Supabase) for this verified active family
          const adapter = createRepository(chosen.familyId);
          familyStore.setRepository(adapter);
        }
      } else {
        setActiveFamily(null);
        setCurrentRole(ROLES.VIEWER);
        localStorage.removeItem(FAMILY_ID_KEY);
      }

      return verified;
    } catch (err) {
      console.error('Error in loadUserMemberships:', err);
      setMemberships([]);
      setActiveFamily(null);
      return [];
    } finally {
      setLoadingMemberships(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadUserMemberships();
    }
  }, [authLoading, loadUserMemberships]);

  // Track sync status
  useEffect(() => {
    const unsub = familyStore.subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  /**
   * Switches the active family.
   * Authoritative: Never trusts unverified family IDs.
   * Reloads FamilyStore cleanly, clears previous family state, and reloads tree.
   */
  const switchFamily = useCallback((newFamilyId) => {
    if (!newFamilyId) return false;

    const target = memberships.find((m) => m.familyId === newFamilyId);
    if (!target) {
      console.error(`Security violation: Cannot switch to unverified family ${newFamilyId}`);
      return false;
    }

    // Set new active family selector
    localStorage.setItem(FAMILY_ID_KEY, newFamilyId);
    setActiveFamily(target.family);
    setCurrentRole(target.role);
    initializedFamilyIdRef.current = newFamilyId;

    // Switch FamilyStore repository to the new family and reload
    const adapter = createRepository(newFamilyId);
    familyStore.setRepository(adapter);

    return true;
  }, [memberships]);

  /**
   * Secure Logout:
   * Clears auth state, active cloud family, stops cloud data rendering,
   * clears in-memory private family state so no private data lingers,
   * while preserving local backups in localStorage.
   */
  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error during signOut:', err);
    } finally {
      // Clear cloud active family selector
      localStorage.removeItem(FAMILY_ID_KEY);
      setMemberships([]);
      setActiveFamily(null);
      setCurrentRole(ROLES.VIEWER);
      initializedFamilyIdRef.current = null;

      // Clear in-memory family data so private family state never lingers after logout
      familyStore.loadFromData([], [], [], [], [], []);
      familyStore.setRepository(new LocalAdapter());
    }
  }, [signOut]);

  /**
   * Clears local IndexedDB cache for the active family and re-hydrates from Supabase
   */
  const clearLocalCache = useCallback(async (targetFamilyId) => {
    const fid = targetFamilyId || activeFamily?.id;
    if (!fid) return;
    await familyStore.clearLocalCache(fid);
    const adapter = createRepository(fid);
    familyStore.setRepository(adapter);
  }, [activeFamily]);

  /**
   * Renames the active family (Owner only).
   * Updates database via Supabase and immediately propagates new name to state.
   */
  const renameActiveFamily = useCallback(async (newName) => {
    if (!newName || !newName.trim()) {
      throw new Error('Family name cannot be empty.');
    }
    if (!activeFamily?.id) {
      throw new Error('No active family selected.');
    }
    if (currentRole !== ROLES.OWNER) {
      throw new Error('Only the family owner can rename the family.');
    }

    const trimmed = newName.trim();

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('families')
        .update({ name: trimmed })
        .eq('id', activeFamily.id);

      if (error) {
        throw new Error(error.message);
      }
    }

    // Update local state immediately
    const updatedFamily = { ...activeFamily, name: trimmed };
    setActiveFamily(updatedFamily);
    setMemberships((prev) =>
      prev.map((m) =>
        m.familyId === activeFamily.id
          ? { ...m, family: { ...m.family, name: trimmed } }
          : m
      )
    );

    return updatedFamily;
  }, [activeFamily, currentRole]);

  const value = {
    user,
    memberships,
    activeFamily,
    currentRole,
    syncStatus,
    loading: authLoading || loadingMemberships,
    switchFamily,
    renameActiveFamily,
    refreshMemberships: loadUserMemberships,
    logout,
    clearLocalCache,
    canView: canViewFamily(currentRole),
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}

export function useOptionalFamily() {
  return useContext(FamilyContext);
}
