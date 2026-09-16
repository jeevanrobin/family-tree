import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

/**
 * Authentication Service
 * Handles all Supabase authentication operations with safe Local Mode fallbacks.
 */
export const authService = {
  /**
   * Sign up a new user
   * @param {{email: string, password: string, data?: object}} params
   * @returns {Promise<{user: any, error: any}>}
   */
  async signUp({ email, password, data = {} }) {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: new Error('Supabase is not configured.') };
    }
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...data,
          first_name: data?.firstName || data?.first_name || '',
          email,
          created_at: new Date().toISOString()
        }
      }
    });
    return { user: authData?.user || null, session: authData?.session || null, error };
  },

  /**
   * Sign in an existing user
   * @param {{email: string, password: string}} params
   * @returns {Promise<{user: any, session: any, error: any}>}
   */
  async signIn({ email, password }) {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, session: null, error: new Error('Supabase is not configured.') };
    }
    const { user, session, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { user, session, error };
  },

  /**
   * Sign out the current user
   * @returns {Promise<{error: any}>}
   */
  async signOut() {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Reset password for a user
   * @param {{email: string}} params
   * @returns {Promise<{error: any}>}
   */
  async resetPassword({ email }) {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase is not configured.') };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { error };
  },

  /**
   * Get current session
   * @returns {Promise<{session: any, error: any}>}
   */
  async getSession() {
    if (!isSupabaseConfigured || !supabase) {
      return { session: null, error: null };
    }
    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session || null, error };
  },

  /**
   * Get current user
   * @returns {Promise<{user: any, error: any}>}
   */
  async getUser() {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: null };
    }
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user || null, error };
  },

  /**
   * Update user profile or password
   * @param {{data?: object, password?: string}} params
   * @returns {Promise<{user: any, error: any}>}
   */
  async updateUser({ data, password } = {}) {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: new Error('Supabase is not configured.') };
    }
    const updates = {};
    if (data) updates.data = data;
    if (password) updates.password = password;

    const { data: user, error } = await supabase.auth.updateUser(updates);
    return { user, error };
  },

  /**
   * Listen to auth state changes
   * @param {Function} callback
   * @returns {*} Supabase subscription object
   */
  onAuthStateChange(callback) {
    if (!isSupabaseConfigured || !supabase) {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};