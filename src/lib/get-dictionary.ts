/**
 * src/lib/get-dictionary.ts
 * Dictionary loader for static i18n.
 * Uses dynamic imports so only the needed locale JSON is bundled per-page.
 */

import { type Locale } from './i18n'

// Dynamic import map — each locale is a separate JSON chunk
const dictionaries = {
  en: () => import('@/dictionaries/en.json').then((m) => m.default),
  hi: () => import('@/dictionaries/hi.json').then((m) => m.default),
  sa: () => import('@/dictionaries/sa.json').then((m) => m.default),
  ru: () => import('@/dictionaries/ru.json').then((m) => m.default),
}

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale]()
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
