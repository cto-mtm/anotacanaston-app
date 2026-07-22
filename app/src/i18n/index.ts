import { createI18n } from 'vue-i18n'
import common from './locales/configs/common'
import shell from './locales/components/shell'
import home from './locales/pages/home'
import itemDetail from './locales/pages/itemDetail'
import about from './locales/pages/about'
import notFound from './locales/pages/notFound'

export const SUPPORTED_LOCALES = ['es', 'en'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const messages = {
  es: {
    common: common.es,
    shell: shell.es,
    home: home.es,
    itemDetail: itemDetail.es,
    about: about.es,
    notFound: notFound.es,
  },
  en: {
    common: common.en,
    shell: shell.en,
    home: home.en,
    itemDetail: itemDetail.en,
    about: about.en,
    notFound: notFound.en,
  },
}

type MessageSchema = (typeof messages)['es']

// Augments vue-i18n's types so `t('home.title')` autocompletes and
// cross-locale key mismatches are caught by tsc.
declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
}

const i18n = createI18n({
  legacy: false,
  locale: 'es',
  fallbackLocale: 'en',
  messages,
  datetimeFormats: {
    es: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
    },
    en: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
    },
  },
})

export default i18n
