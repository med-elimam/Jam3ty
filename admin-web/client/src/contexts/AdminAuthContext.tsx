import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminAuthContextValue {
  /** The currently authenticated user, or null when not logged in. */
  user: User | null;
  /** True while /api/auth/me is loading for the first time. */
  isLoading: boolean;
  /** True once we know whether the user is authenticated or not. */
  isReady: boolean;
  /** True when a valid token exists and /api/auth/me returned successfully. */
  isAuthenticated: boolean;
  /** True when the authenticated user has the super_admin role. */
  isAdmin: boolean;
  /**
   * Store the tokens returned from login, then invalidate the /me query so
   * the context refetches the user automatically.
   */
  signIn: (accessToken: string, refreshToken: string) => void;
  /** Clear localStorage tokens and remove /me from the cache. */
  signOut: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

// Distinct localStorage keys from student-web's "auth_token"/"auth_refresh_token":
// in production both apps are served from the same origin (student-web at "/",
// admin-web at "/admin"), so they'd otherwise clobber each other's session.
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_token');
  });
  const hasToken = Boolean(accessToken);

  const {
    data: meData,
    isLoading,
    isSuccess,
  } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: hasToken,
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 min
    },
  });

  const user: User | null = isSuccess ? (meData?.data ?? null) : null;
  const isReady = !isLoading;
  const isAuthenticated = isSuccess && user !== null;
  const isAdmin = isAuthenticated && user?.role === 'super_admin';

  const signIn = useCallback(
    (accessToken: string, refreshToken: string) => {
      localStorage.setItem('admin_token', accessToken);
      localStorage.setItem('admin_refresh_token', refreshToken);
      setAccessToken(accessToken);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    setAccessToken(null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
  }, [queryClient]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({ user, isLoading, isReady, isAuthenticated, isAdmin, signIn, signOut }),
    [user, isLoading, isReady, isAuthenticated, isAdmin, signIn, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  }
  return ctx;
}
