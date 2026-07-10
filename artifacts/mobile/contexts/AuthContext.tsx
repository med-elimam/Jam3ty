import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@/lib/urls';

const setToken = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getToken = async (key: string) => {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    return null;
  }
  return await SecureStore.getItemAsync(key);
};

const deleteToken = async (key: string) => {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

// ─── API base URL ────────────────────────────────────────────────────────────
setBaseUrl(API_BASE_URL || null);

// ─── Secure store keys ───────────────────────────────────────────────────────
const ACCESS_KEY = 'jamiati_access_token';
const REFRESH_KEY = 'jamiati_refresh_token';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  profile?: {
    language?: string;
    onboardingComplete?: boolean;
    universityId?: string | null;
    departmentId?: string | null;
    levelId?: string | null;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  /** True for the client-only guest session — protected API calls would all 401. */
  isGuest: boolean;
  login: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<AuthUser>) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function decodeJwtExpiry(token: string): number | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    // Safe base64url → base64 decode that works in React Native (no atob needed)
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const { exp } = JSON.parse(decoded) as { exp?: number };
    return exp ?? null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const exp = decodeJwtExpiry(token);
  if (!exp) return true;
  return Date.now() / 1000 > exp - 60; // 60s buffer
}

async function refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const refreshToken = await getToken(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { success: boolean; data?: { accessToken: string; refreshToken: string } };
    if (!data.success || !data.data) return null;
    return data.data;
  } catch {
    return null;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
const GUEST_USER: AuthUser = {
  id: 'guest',
  fullName: 'Guest / زائر',
  email: 'guest@jamiati.mr',
  role: 'student',
  profile: { language: 'ar', onboardingComplete: true },
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: false,
  login: async () => {},
  loginAsGuest: () => {},
  logout: async () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const qc = useQueryClient();
  const router = useRouter();
  const segments = useSegments();
  const initDone = useRef(false);

  // ── Set up the auth token getter for the API client ──
  const accessTokenRef = useRef<string | null>(null);
  accessTokenRef.current = state.accessToken;

  useEffect(() => {
    setAuthTokenGetter(async () => {
      let token = accessTokenRef.current;
      if (!token) {
        // Try to restore from SecureStore/localStorage
        token = await getToken(ACCESS_KEY);
      }
      if (!token) return null;
      if (isTokenExpired(token)) {
        // Try refresh
        const refreshed = await refreshAccessToken();
        if (!refreshed) return null;
        await setToken(ACCESS_KEY, refreshed.accessToken);
        await setToken(REFRESH_KEY, refreshed.refreshToken);
        accessTokenRef.current = refreshed.accessToken;
        setState((s) => ({ ...s, accessToken: refreshed.accessToken }));
        return refreshed.accessToken;
      }
      return token;
    });
  }, []);

  // ── Bootstrap: restore session ──
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      try {
        let token = await getToken(ACCESS_KEY);
        if (!token) {
          setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
          return;
        }

        if (isTokenExpired(token)) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            await deleteToken(ACCESS_KEY);
            await deleteToken(REFRESH_KEY);
            setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
            return;
          }
          await setToken(ACCESS_KEY, refreshed.accessToken);
          await setToken(REFRESH_KEY, refreshed.refreshToken);
          token = refreshed.accessToken;
        }

        // Fetch /auth/me
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
          return;
        }
        const data = await res.json() as { success: boolean; data?: AuthUser };
        if (!data.success || !data.data) {
          setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
          return;
        }
        setState({ user: data.data, accessToken: token, isLoading: false, isAuthenticated: true });
      } catch {
        setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
      }
    })();
  }, []);

  // ── Navigate based on auth state ──
  useEffect(() => {
    if (state.isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inTabs = segments[0] === '(tabs)';

    if (!state.isAuthenticated) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    const onboardingDone = state.user?.profile?.onboardingComplete;
    if (!onboardingDone && segments[1] !== 'onboarding') {
      router.replace('/(auth)/onboarding');
      return;
    }

    if (onboardingDone && (inAuth)) {
      router.replace('/(tabs)');
    }
  }, [state.isLoading, state.isAuthenticated, state.user, segments]);

  // ── Auth methods ──
  const login = useCallback(async (user: AuthUser, accessToken: string, refreshToken: string) => {
    await setToken(ACCESS_KEY, accessToken);
    await setToken(REFRESH_KEY, refreshToken);
    accessTokenRef.current = accessToken;
    setState({ user, accessToken, isLoading: false, isAuthenticated: true });
  }, []);

  const loginAsGuest = useCallback(() => {
    accessTokenRef.current = 'guest';
    setState({ user: GUEST_USER, accessToken: 'guest', isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = await getToken(ACCESS_KEY);
      const refresh = await getToken(REFRESH_KEY);
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        }).catch(() => {});
      }
    } finally {
      await deleteToken(ACCESS_KEY);
      await deleteToken(REFRESH_KEY);
      accessTokenRef.current = null;
      qc.clear();
      setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
    }
  }, [qc]);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setState((s) => s.user ? { ...s, user: { ...s.user, ...partial } } : s);
  }, []);

  const value = useMemo(
    () => ({ ...state, isGuest: state.user?.id === GUEST_USER.id, login, loginAsGuest, logout, updateUser }),
    [state, login, loginAsGuest, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
