import React, { createContext, useContext, useEffect, useState } from 'react';
import { type Lang, resolveKey } from '@/i18n/admin-translations';

interface AdminI18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const AdminI18nContext = createContext<AdminI18nContextType | undefined>(undefined);

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_language');
      if (saved === 'ar' || saved === 'fr') return saved;
    }
    return 'ar';
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_language', newLang);
    }
  };

  const isRTL = lang === 'ar';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [lang, isRTL]);

  const value: AdminI18nContextType = {
    lang,
    setLang,
    t: (key: string) => resolveKey(lang, key),
    isRTL,
  };

  return (
    <AdminI18nContext.Provider value={value}>
      {children}
    </AdminI18nContext.Provider>
  );
}

export function useAdminI18n() {
  const context = useContext(AdminI18nContext);
  if (!context) {
    throw new Error('useAdminI18n must be used within AdminI18nProvider');
  }
  return context;
}
