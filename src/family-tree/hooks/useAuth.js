import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../auth/authService.js';

/**
 * Authentication State Hook
 * Manages auth state throughout the application
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track initialization to prevent duplicate auth state updates
  const hasInitializedRef = useRef(false);
  const userIdRef = useRef(null);

  // Initialize auth state
  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true);
        const { session: currentSession, error: sessionError } = await authService.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        setSession(currentSession);
        
        if (currentSession) {
          const { user: currentUser, error: userError } = await authService.getUser();
          
          if (userError) {
            throw userError;
          }
          
          setUser(currentUser);
          userIdRef.current = currentUser?.id;
        } else {
          setUser(null);
          userIdRef.current = null;
        }

        hasInitializedRef.current = true;
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
        setUser(null);
        setSession(null);
        userIdRef.current = null;
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const result = authService.onAuthStateChange((event, session) => {
      console.log('useAuth: onAuthStateChange event=', event, 'session=', !!session);
      
      const newUserId = session?.user?.id;
      const currentUserId = userIdRef.current;

      // TOKEN_REFRESHED: Session is still valid, just update session silently
      if (event === 'TOKEN_REFRESHED') {
        console.log('useAuth: TOKEN_REFRESHED - updating session only');
        setSession(session);
        return;
      }

      // SIGNED_IN: Check if this is a new user session or just session recovery
      if (event === 'SIGNED_IN' && session) {
        // If we're already initialized with the same user, this is just session recovery
        if (hasInitializedRef.current && newUserId === currentUserId) {
          console.log('useAuth: SIGNED_IN session recovery for same user - updating session only');
          setSession(session);
          return;
        }

        // This is a new sign-in or different user
        console.log('useAuth: SIGNED_IN new session - updating user');
        setSession(session);
        setUser(session.user);
        userIdRef.current = newUserId;
        hasInitializedRef.current = true;
        return;
      }

      // SIGNED_OUT: Clear everything
      if (event === 'SIGNED_OUT') {
        console.log('useAuth: SIGNED_OUT - clearing state');
        setSession(null);
        setUser(null);
        userIdRef.current = null;
        hasInitializedRef.current = false;
        return;
      }

      // USER_UPDATED: Fetch fresh user data
      if (event === 'USER_UPDATED' && session) {
        console.log('useAuth: USER_UPDATED - fetching fresh user data');
        setSession(session);
        authService.getUser().then(({ user, error }) => {
          if (error) {
            console.error('Error fetching user:', error);
          } else {
            setUser(user);
            userIdRef.current = user?.id;
          }
        });
        return;
      }

      // Default: Just update session
      setSession(session);
    });

    const sub = result?.data?.subscription || result?.subscription;

    return () => {
      if (typeof sub?.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    };
  }, []);

  // Memoized auth methods
  const signIn = useCallback(async ({ email, password }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.signIn({ email, password });
      
      if (result.error) {
        throw result.error;
      }
      
      setSession(result.session);
      setUser(result.user);
      userIdRef.current = result.user?.id;
      hasInitializedRef.current = true;
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async ({ email, password, data }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.signUp({ email, password, data });
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.signOut();
      
      if (result.error) {
        throw result.error;
      }
      
      setUser(null);
      setSession(null);
      userIdRef.current = null;
      hasInitializedRef.current = false;
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async ({ email }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.resetPassword({ email });
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async ({ data, password } = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.updateUser({ data, password });
      
      if (result.error) {
        throw result.error;
      }
      
      setUser(result.user);
      userIdRef.current = result.user?.id;
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateUser
  };
}

export default useAuth;
