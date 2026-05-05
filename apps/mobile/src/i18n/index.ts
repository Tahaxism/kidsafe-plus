import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import fr from './locales/fr';
import ar from './locales/ar';
import en from './locales/en';

export type SupportedLanguage = 'fr' | 'ar' | 'en';

const STORAGE_KEY = 'kidsafe.lang';

const resources = {
  fr: { translation: fr },
  ar: { translation: ar },
  en: { translation: en },
};

const detectInitialLanguage = (): SupportedLanguage => {
  const tags = Localization.getLocales();
  for (const t of tags) {
    const code = (t.languageCode ?? 'fr').toLowerCase();
    if (code === 'fr') return 'fr';
    if (code === 'ar') return 'ar';
    if (code === 'en') return 'en';
  }
  return 'fr';
};

export const isRTL = (lang: SupportedLanguage): boolean => lang === 'ar';

export const initI18n = async (): Promise<void> => {
  let stored: SupportedLanguage | null = null;
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v === 'fr' || v === 'ar' || v === 'en') stored = v;
  } catch {
    // ignore
  }
  const lang: SupportedLanguage = stored ?? detectInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: 'fr',
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  // RTL handling — only flip if it differs to avoid an unnecessary reload prompt
  const shouldRTL = isRTL(lang);
  if (I18nManager.isRTL !== shouldRTL) {
    I18nManager.allowRTL(shouldRTL);
    I18nManager.forceRTL(shouldRTL);
  }
};

export const changeLanguage = async (lang: SupportedLanguage): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
  const shouldRTL = isRTL(lang);
  if (I18nManager.isRTL !== shouldRTL) {
    I18nManager.allowRTL(shouldRTL);
    I18nManager.forceRTL(shouldRTL);
    // Caller is responsible for prompting the user to restart the app
  }
};

export default i18n;
