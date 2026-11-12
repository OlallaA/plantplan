import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import gl from './locales/gl.json'

export const languages = { gl: 'Galego', es: 'Castellano' }
const defaultLanguage = 'gl'
const languageKey = 'plantplan.languagePreference'

function initialLanguage() {
  try {
    const saved = localStorage.getItem(languageKey)
    if (Object.hasOwn(languages, saved)) return saved
  } catch {
    // The selector still works when browser storage is unavailable.
  }
  return defaultLanguage
}

export function selectLanguage(language) {
  i18n.changeLanguage(language)
  try {
    localStorage.setItem(languageKey, language)
  } catch {
    // The current language is still held in memory.
  }
}

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
  document.title = i18n.t('page.title', { lng: language })
  document.querySelector('meta[name="description"]').content = i18n.t('page.description', { lng: language })
})

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, gl: { translation: gl } },
  lng: initialLanguage(),
  supportedLngs: Object.keys(languages),
  fallbackLng: defaultLanguage,
  initAsync: false,
  interpolation: { escapeValue: false },
})
