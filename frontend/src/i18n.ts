import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import dashboardEN from './locales/en/dashboard.json';
import calendarEN from './locales/en/calendar.json';
import profileEN from './locales/en/profile.json';
import metricsEN from './locales/en/metrics.json';
import validationEN from './locales/en/validation.json';
import errorsEN from './locales/en/errors.json';
import soonEN from './locales/en/soon.json';

import commonFR from './locales/fr/common.json';
import authFR from './locales/fr/auth.json';
import dashboardFR from './locales/fr/dashboard.json';
import calendarFR from './locales/fr/calendar.json';
import profileFR from './locales/fr/profile.json';
import metricsFR from './locales/fr/metrics.json';
import validationFR from './locales/fr/validation.json';
import errorsFR from './locales/fr/errors.json';
import soonFR from './locales/fr/soon.json';

const resources = {
  en: {
    common: commonEN,
    auth: authEN,
    dashboard: dashboardEN,
    calendar: calendarEN,
    profile: profileEN,
    metrics: metricsEN,
    validation: validationEN,
    errors: errorsEN,
    soon:soonEN
  },
  fr: {
    common: commonFR,
    auth: authFR,
    dashboard: dashboardFR,
    calendar: calendarFR,
    profile: profileFR,
    metrics: metricsFR,
    validation: validationFR,
    errors: errorsFR,
    soon:soonFR
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'calendar', 'profile', 'metrics', 'validation', 'errors', 'soon'],

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'promethia_language'
    },

    interpolation: {
      escapeValue: false // React already escapes values
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;
