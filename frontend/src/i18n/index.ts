/**
 * Localisation. All user-facing copy lives in ./locales/<lang>.json.
 * To add a language: add a JSON file with the same keys and register it in SUPPORTED_LANGUAGES.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'

export const SUPPORTED_LANGUAGES = [{ code: 'en', nativeName: 'English' }] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur'])

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export function applyLanguage(code: string) {
  const supported = SUPPORTED_LANGUAGES.some((l) => l.code === code) ? code : 'en'
  if (i18n.language !== supported) void i18n.changeLanguage(supported)
  document.documentElement.lang = supported
  document.documentElement.dir = RTL_LANGUAGES.has(supported) ? 'rtl' : 'ltr'
}

export default i18n
