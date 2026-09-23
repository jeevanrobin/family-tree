import { useState, useEffect, useCallback } from 'react';
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
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const result = authService.onAuthStateChange((event, session) => {
      // Ignore TOKEN_REFRESHED events - these happen frequently on tab focus
      // and don't require re-fetching user data (session is still valid)
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        return; // Don't re-fetch user on token refresh
      }

      setSession(session);
      
      if (session) {
        authService.getUser().then(({ user, error }) => {
          if (error) {
            console.error('Error fetching user:', error);
            setUser(null);
          } else {
            setUser(user);
          }
        });
      } else {
        setUser(null);
      }
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