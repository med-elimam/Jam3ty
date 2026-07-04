import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** The currently authenticated user, or null when not logged in. */
  user: User | null;
  /** True while /api/auth/me is loading for the first time. */
  isLoading: boolean;
  /** True once we know whether the user is authenticated or not. */
  isReady: boolean;
  /** True when a valid token exists and /api/auth/me returned successfully. */
  isAuthenticated: boolean;
  /**
   * Store the tokens returned from login/register, then invalidate the
   * /me query so the context refetches the user automatically.
   */
  signIn: (accessToken: string, refreshToken: string) => void;
  /** Clear localStorage tokens and remove /me from the cache. */
  signOut: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Determine whether we even have a token before firing the request.
  const hasToken = Boolean(
    typeof window !== 'undefined' && localStorage.getItem('auth_token'),
  );

  const {
    data: meData,
    isLoading,
    isSuccess,
    isError,
  } = useGetMe({
    query: {
      // Only fetch if a token exists; avoids a 401 on page load for guests.
      enabled: hasToken,
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 min
    },
  });

  const user: User | null = isSuccess ? (meData?.data ?? null) : null;
  const isReady = !isLoading;
  const isAuthenticated = isSuccess && user !== null;

  const signIn = useCallback(
    (accessToken: string, refreshToken: string) => {
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('auth_refresh_token', refreshToken);
      // Invalidate /me so AuthContext refetches with the new token.
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
    // Remove user data from query cache so all subscribers see null.
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
  }, [queryClient]);

  // Keep legacy key in sync for code that may still read it (transient safety).
  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isReady, isAuthenticated, signIn, signOut }),
    [user, isLoading, isReady, isAuthenticated, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
