import { createI18n } from 'vue-i18n'
import common from './locales/configs/common'
import game from './locales/configs/game'
import shell from './locales/components/shell'
import home from './locales/pages/home'
import sessionDetail from './locales/pages/sessionDetail'
import newSession from './locales/pages/newSession'
import gameScreen from './locales/pages/gameScreen'
import roundEntry from './locales/pages/roundEntry'
import summary from './locales/pages/summary'
import rules from './locales/pages/rules'
import settings from './locales/pages/settings'
import about from './locales/pages/about'
import notFound from './locales/pages/notFound'
import welcome from './locales/pages/welcome'
import account from './locales/pages/account'
import club from './locales/pages/club'
import privacy from './locales/pages/privacy'
import dashboard from './locales/pages/dashboard'

export const SUPPORTED_LOCALES = ['es', 'en'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const messages = {
  es: {
    common: common.es,
    game: game.es,
    shell: shell.es,
    home: home.es,
    sessionDetail: sessionDetail.es,
    newSession: newSession.es,
    gameScreen: gameScreen.es,
    roundEntry: roundEntry.es,
    summary: summary.es,
    rules: rules.es,
    settings: settings.es,
    about: about.es,
    notFound: notFound.es,
    welcome: welcome.es,
    account: account.es,
    club: club.es,
    privacy: privacy.es,
    dashboard: dashboard.es,
  },
  en: {
    common: common.en,
    game: game.en,
    shell: shell.en,
    home: home.en,
    sessionDetail: sessionDetail.en,
    newSession: newSession.en,
    gameScreen: gameScreen.en,
    roundEntry: roundEntry.en,
    summary: summary.en,
    rules: rules.en,
    settings: settings.en,
    about: about.en,
    notFound: notFound.en,
    welcome: welcome.en,
    account: account.en,
    club: club.en,
    privacy: privacy.en,
    dashboard: dashboard.en,
  },
}

type MessageSchema = (typeof messages)['es']

// Augments vue-i18n's types so `t('home.title')` autocompletes and
// cross-locale key mismatches are caught by tsc.
declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation via interface merging requires this shape
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
  // `currency` is overridden per call (n(value, { key: 'currency', currency })).
  numberFormats: {
    es: {
      currency: { style: 'currency', currency: 'USD' },
      percent: { style: 'percent', maximumFractionDigits: 0 },
    },
    en: {
      currency: { style: 'currency', currency: 'USD' },
      percent: { style: 'percent', maximumFractionDigits: 0 },
    },
  },
})

export default i18n
