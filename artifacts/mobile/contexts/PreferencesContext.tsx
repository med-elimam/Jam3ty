import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang, resolveKey, resolveArray } from '@/i18n/translations';

export type ThemePref = 'system' | 'light' | 'dark';
export type ProfileVisibility = 'private' | 'university' | 'public';

export interface NotifPrefs {
  announcements: boolean;
  files: boolean;
  assignments: boolean;
  exams: boolean;
  community: boolean;
  subscription: boolean;
}

export interface PrivacyPrefs {
  profileVisibility: ProfileVisibility;
  allowMessages: boolean;
}

interface PersistedPrefs {
  language: Lang;
  theme: ThemePref;
  notif: NotifPrefs;
  privacy: PrivacyPrefs;
}

const STORAGE_KEY = 'jamiati_prefs_v1';

const DEFAULTS: PersistedPrefs = {
  language: 'ar',
  theme: 'system',
  notif: {
    announcements: true,
    files: true,
    assignments: true,
    exams: true,
    community: true,
    subscription: true,
  },
  privacy: {
    profileVisibility: 'university',
    allowMessages: true,
  },
};

interface PreferencesContextValue {
  ready: boolean;
  language: Lang;
  isRTL: boolean;
  theme: ThemePref;
  resolvedScheme: 'light' | 'dark';
  notif: NotifPrefs;
  privacy: PrivacyPrefs;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
  setLanguage: (lang: Lang) => void;
  setTheme: (theme: ThemePref) => void;
  setNotif: (key: keyof NotifPrefs, value: boolean) => void;
  setPrivacy: <K extends keyof PrivacyPrefs>(key: K, value: PrivacyPrefs[K]) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [prefs, setPrefs] = useState<PersistedPrefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  // Load persisted prefs once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedPrefs>;
          setPrefs({
            language: parsed.language ?? DEFAULTS.language,
            theme: parsed.theme ?? DEFAULTS.theme,
            notif: { ...DEFAULTS.notif, ...(parsed.notif ?? {}) },
            privacy: { ...DEFAULTS.privacy, ...(parsed.privacy ?? {}) },
          });
        }
      } catch {
        // fall back to defaults
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback((next: PersistedPrefs) => {
    setPrefs(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setLanguage = useCallback(
    (language: Lang) => persist({ ...prefsRef.current, language }),
    [persist],
  );
  const setTheme = useCallback(
    (theme: ThemePref) => persist({ ...prefsRef.current, theme }),
    [persist],
  );
  const setNotif = useCallback(
    (key: keyof NotifPrefs, value: boolean) =>
      persist({ ...prefsRef.current, notif: { ...prefsRef.current.notif, [key]: value } }),
    [persist],
  );
  const setPrivacy = useCallback(
    <K extends keyof PrivacyPrefs>(key: K, value: PrivacyPrefs[K]) =>
      persist({ ...prefsRef.current, privacy: { ...prefsRef.current.privacy, [key]: value } }),
    [persist],
  );

  // Keep a ref so setters always compose against the latest state.
  const prefsRef = React.useRef(prefs);
  prefsRef.current = prefs;

  const resolvedScheme: 'light' | 'dark' =
    prefs.theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : prefs.theme;

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = resolveKey(prefs.language, key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return str;
    },
    [prefs.language],
  );

  const tArray = useCallback((key: string) => resolveArray(prefs.language, key), [prefs.language]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      ready,
      language: prefs.language,
      isRTL: prefs.language === 'ar',
      theme: prefs.theme,
      resolvedScheme,
      notif: prefs.notif,
      privacy: prefs.privacy,
      t,
      tArray,
      setLanguage,
      setTheme,
      setNotif,
      setPrivacy,
    }),
    [ready, prefs, resolvedScheme, t, tArray, setLanguage, setTheme, setNotif, setPrivacy],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}

/** Convenience hook returning just the translate fn + direction. */
export function useT() {
  const { t, tArray, isRTL, language } = usePreferences();
  return { t, tArray, isRTL, language };
}

/** Resolved color scheme honoring the user's Appearance preference. */
export function useResolvedScheme(): 'light' | 'dark' {
  const ctx = useContext(PreferencesContext);
  return ctx?.resolvedScheme ?? 'light';
}
