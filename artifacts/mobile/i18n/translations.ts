/**
 * Jamiati — جامعتي · i18n dictionaries
 * Arabic (primary, RTL) + French (secondary, LTR).
 * Access with the `t()` helper from PreferencesContext via useT().
 */

export type Lang = 'ar' | 'fr';

// Flat-ish nested dictionary. Access with dot keys: t('nav.home')
const ar = {
  common: {
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    delete: 'حذف',
    close: 'إغلاق',
    back: 'رجوع',
    loading: 'جارٍ التحميل…',
    retry: 'إعادة المحاولة',
    search: 'بحث',
    all: 'الكل',
    yes: 'نعم',
    no: 'لا',
    on: 'مفعّل',
    off: 'معطّل',
    comingSoonTitle: 'غير متاح',
    devDisabled: 'هذه الميزة غير مفعّلة في بيئة التطوير.',
  },
  nav: {
    home: 'الرئيسية',
    courses: 'المواد',
    timetable: 'الجدول',
    community: 'المجتمع',
    profile: 'الملف',
    more: 'المزيد',
  },
  screens: {
    more: 'جميع الأقسام',
    files: 'الملفات',
    announcements: 'الإعلانات',
    assignments: 'الواجبات',
    exams: 'الامتحانات',
    events: 'الفعاليات',
    clubs: 'النوادي',
    opportunities: 'الفرص',
    ai: 'المساعد الذكي',
    subscription: 'الاشتراك',
    notifications: 'الإشعارات',
    settings: 'الإعدادات',
    course: '',
  },
  settings: {
    sectionApp: 'التطبيق',
    sectionAccount: 'الحساب',
    sectionAbout: 'حول التطبيق',
    language: 'اللغة',
    appearance: 'المظهر',
    notifications: 'الإشعارات',
    changePassword: 'تغيير كلمة المرور',
    privacy: 'الخصوصية',
    deleteAccount: 'حذف الحساب',
    appVersion: 'إصدار التطبيق',
    help: 'المساعدة والدعم',
    terms: 'الشروط والأحكام',
    privacyPolicy: 'سياسة الخصوصية',
    logout: 'تسجيل الخروج',
    logoutConfirm: 'هل أنت متأكد من تسجيل الخروج؟',
    footer: 'جامعتي · جامعتك في جيبك · صُنع بكل ❤️ للطلاب الموريتانيين',
    // Language screen
    languageTitle: 'اختر اللغة',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageNote: 'سيتم تطبيق اللغة فوراً على كامل التطبيق.',
    // Appearance
    appearanceTitle: 'المظهر',
    themeSystem: 'حسب النظام',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    // Notifications
    notificationsTitle: 'تفضيلات الإشعارات',
    notifAnnouncements: 'الإعلانات',
    notifFiles: 'الملفات الجديدة',
    notifAssignments: 'الواجبات',
    notifExams: 'الامتحانات',
    notifCommunity: 'الرسائل والمجتمع',
    notifSubscription: 'الاشتراك',
    // Privacy
    privacyTitle: 'إعدادات الخصوصية',
    profileVisibility: 'ظهور الملف الشخصي',
    visPrivate: 'خاص',
    visUniversity: 'نفس الجامعة',
    visPublic: 'عام',
    allowMessages: 'السماح بالرسائل',
    blockedUsers: 'المستخدمون المحظورون',
    blockedEmpty: 'لا يوجد مستخدمون محظورون.',
    // Delete account
    deleteConfirmTitle: 'حذف الحساب',
    deleteConfirmBody: 'هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟',
    deleteDevDisabled: 'حذف الحساب غير مفعّل في بيئة التطوير.',
    changePwDevDisabled: 'تغيير كلمة المرور غير مفعّل في بيئة التطوير.',
    saved: 'تم الحفظ',
  },
  timetable: {
    thisWeek: 'هذا الأسبوع',
    sessionsCount: '{n} محاضرة',
    emptyTitle: 'لا توجد محاضرات',
    emptyBody: 'لا توجد محاضرات مجدولة لهذا اليوم.',
    lecture: 'محاضرة',
    td: 'أعمال موجهة',
    tp: 'أعمال تطبيقية',
    other: 'أخرى',
    room: 'القاعة',
  },
  days: {
    full: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    short: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
  },
} as const;

const fr = {
  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    close: 'Fermer',
    back: 'Retour',
    loading: 'Chargement…',
    retry: 'Réessayer',
    search: 'Rechercher',
    all: 'Tout',
    yes: 'Oui',
    no: 'Non',
    on: 'Activé',
    off: 'Désactivé',
    comingSoonTitle: 'Indisponible',
    devDisabled: "Cette fonctionnalité n'est pas activée en développement.",
  },
  nav: {
    home: 'Accueil',
    courses: 'Cours',
    timetable: 'Emploi du temps',
    community: 'Communauté',
    profile: 'Profil',
    more: 'Plus',
  },
  screens: {
    more: 'Tous les modules',
    files: 'Fichiers',
    announcements: 'Annonces',
    assignments: 'Devoirs',
    exams: 'Examens',
    events: 'Événements',
    clubs: 'Clubs',
    opportunities: 'Opportunités',
    ai: 'Assistant IA',
    subscription: 'Abonnement',
    notifications: 'Notifications',
    settings: 'Paramètres',
    course: '',
  },
  settings: {
    sectionApp: 'Application',
    sectionAccount: 'Compte',
    sectionAbout: "À propos",
    language: 'Langue',
    appearance: 'Apparence',
    notifications: 'Notifications',
    changePassword: 'Changer le mot de passe',
    privacy: 'Confidentialité',
    deleteAccount: 'Supprimer le compte',
    appVersion: "Version de l'application",
    help: 'Aide et support',
    terms: 'Conditions générales',
    privacyPolicy: 'Politique de confidentialité',
    logout: 'Déconnexion',
    logoutConfirm: 'Voulez-vous vraiment vous déconnecter ?',
    footer: 'Jamiati · Votre université dans votre poche',
    languageTitle: 'Choisir la langue',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageNote: "La langue sera appliquée immédiatement à toute l'application.",
    appearanceTitle: 'Apparence',
    themeSystem: 'Système',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    notificationsTitle: 'Préférences de notifications',
    notifAnnouncements: 'Annonces',
    notifFiles: 'Nouveaux fichiers',
    notifAssignments: 'Devoirs',
    notifExams: 'Examens',
    notifCommunity: 'Messages et communauté',
    notifSubscription: 'Abonnement',
    privacyTitle: 'Paramètres de confidentialité',
    profileVisibility: 'Visibilité du profil',
    visPrivate: 'Privé',
    visUniversity: 'Même université',
    visPublic: 'Public',
    allowMessages: 'Autoriser les messages',
    blockedUsers: 'Utilisateurs bloqués',
    blockedEmpty: 'Aucun utilisateur bloqué.',
    deleteConfirmTitle: 'Supprimer le compte',
    deleteConfirmBody: 'Cette action est irréversible. Continuer ?',
    deleteDevDisabled: "La suppression du compte n'est pas activée en développement.",
    changePwDevDisabled: "Le changement de mot de passe n'est pas activé en développement.",
    saved: 'Enregistré',
  },
  timetable: {
    thisWeek: 'Cette semaine',
    sessionsCount: '{n} séance(s)',
    emptyTitle: 'Aucun cours',
    emptyBody: "Aucun cours programmé pour ce jour.",
    lecture: 'Cours',
    td: 'TD',
    tp: 'TP',
    other: 'Autre',
    room: 'Salle',
  },
  days: {
    full: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    short: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  },
} as const;

export const dictionaries: Record<Lang, typeof ar> = { ar, fr: fr as unknown as typeof ar };

/** Resolve a dot-path key against a dictionary. Returns the key itself if missing. */
export function resolveKey(lang: Lang, key: string): string {
  const parts = key.split('.');
  let node: any = dictionaries[lang];
  for (const p of parts) {
    node = node?.[p];
    if (node == null) return key;
  }
  return typeof node === 'string' ? node : key;
}

/** Return an array value (e.g. days.full) for the given language. */
export function resolveArray(lang: Lang, key: string): string[] {
  const parts = key.split('.');
  let node: any = dictionaries[lang];
  for (const p of parts) node = node?.[p];
  return Array.isArray(node) ? node : [];
}
