/**
 * src/lib/i18n.ts
 * Core i18n configuration for the static export app.
 */

export const locales = ['en', 'hi', 'sa', 'ru'] as const
export type Locale = typeof locales[number]
export const defaultLocale: Locale = 'en'

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  sa: 'संस्कृत',
  ru: 'Русский',
}

export function isValidLocale(lang: string): lang is Locale {
  return locales.includes(lang as Locale)
}
