import React, { createContext, useContext, useEffect, useState } from 'react';
import { type Lang, resolveKey, resolveArray } from '@/i18n/translations';

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ta: (key: string) => string[];
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language');
      if (saved === 'ar' || saved === 'fr') return saved;
    }
    return 'ar';
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', newLang);
    }
  };

  const isRTL = lang === 'ar';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      // Keep the viewport coordinate system LTR; the app shell applies RTL
      // direction internally where needed. This avoids horizontal clipping on
      // mobile browsers with RTL scroll origins.
      document.documentElement.dir = 'ltr';
    }
  }, [lang, isRTL]);

  const value: I18nContextType = {
    lang,
    setLang,
    t: (key: string, vars?: Record<string, string | number>) => {
      const resolved = resolveKey(lang, key);
      if (!vars) return resolved;
      return Object.entries(vars).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        resolved,
      );
    },
    ta: (key: string) => resolveArray(lang, key),
    isRTL,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
