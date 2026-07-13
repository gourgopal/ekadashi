'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { type Locale, locales, localeLabels } from '@/lib/i18n'
import type { Dictionary } from '@/lib/get-dictionary'
import TilakIcon from '@/components/TilakIcon'
import NotificationBell from '@/components/NotificationBell'

interface NavigationProps {
  lang: Locale
  dict: Dictionary
}

export default function Navigation({ lang, dict }: NavigationProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const navItems = [
    { href: `/${lang}/`,           label: dict.nav.home },
    { href: `/${lang}/calendar/`,  label: dict.nav.calendar },
    { href: `/${lang}/tracker/`,   label: dict.nav.tracker },
    { href: `/${lang}/resources/`, label: dict.nav.resources },
  ]

  const isActive = (href: string) => {
    // root path
    if (href === `/${lang}/`) return pathname === `/${lang}` || pathname === `/${lang}/`
    return pathname.startsWith(href.slice(0, -1))
  }

  return (
    <nav
      id="main-nav"
      className="fixed top-0 left-0 right-0 z-40 glass-dark"
      style={{ borderBottom: '1px solid rgba(244,196,48,0.15)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href={`/${lang}/`}
            className="flex items-center gap-3 group"
            id="nav-logo"
          >
            <TilakIcon size={32} className="om-glow" />
            <div className="leading-tight">
              <div
                className="text-sm font-bold tracking-wide"
                style={{ color: '#F4C430', fontFamily: 'var(--font-display)' }}
              >
                Ekadashi Vrat
              </div>
              <div
                className="text-xs"
                style={{ color: 'rgba(210,180,140,0.7)', fontFamily: 'var(--font-sans)' }}
              >
                {dict.nav.tagline}
              </div>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.href.split('/').filter(Boolean).pop()}`}
                className={`nav-link px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'active text-saffron-300'
                    : 'text-sandstone-300 hover:text-saffron-300'
                }`}
                style={{
                  color: isActive(item.href) ? '#F4C430' : 'rgba(210,180,140,0.8)',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Language switcher + notifications + hamburger */}
          <div className="flex items-center gap-1">
            <NotificationBell />

            {/* Language picker */}
            <div className="relative">
              <button
                id="lang-switcher-btn"
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: 'rgba(244,196,48,0.1)',
                  border: '1px solid rgba(244,196,48,0.25)',
                  color: '#F4C430',
                }}
                aria-label="Switch language"
                aria-expanded={langOpen}
              >
                <span>🌐</span>
                <span>{localeLabels[lang]}</span>
                <span style={{ fontSize: '0.5rem' }}>▼</span>
              </button>

              {langOpen && (
                <div
                  id="lang-dropdown"
                  className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden glass-dark"
                  style={{
                    minWidth: '130px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    border: '1px solid rgba(244,196,48,0.2)',
                  }}
                >
                  {locales.map((locale) => {
                    // Build new path by replacing current locale segment
                    const newPath = pathname.replace(`/${lang}`, `/${locale}`)
                    return (
                      <Link
                        key={locale}
                        href={newPath}
                        id={`lang-${locale}`}
                        onClick={() => setLangOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                        style={{
                          color: locale === lang ? '#F4C430' : 'rgba(210,180,140,0.8)',
                          background:
                            locale === lang
                              ? 'rgba(244,196,48,0.08)'
                              : 'transparent',
                        }}
                      >
                        <span>{locale === lang ? '✓' : ' '}</span>
                        {localeLabels[locale]}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              id="mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex flex-col gap-1.5 w-8 h-8 items-center justify-center"
              aria-label="Toggle mobile menu"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-0.5 w-5 rounded transition-all"
                  style={{ background: '#F4C430' }}
                />
              ))}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            id="mobile-menu"
            className="md:hidden pb-4 pt-2 border-t"
            style={{ borderColor: 'rgba(244,196,48,0.1)' }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-sm font-medium rounded-lg transition-colors"
                style={{
                  color: isActive(item.href) ? '#F4C430' : 'rgba(210,180,140,0.8)',
                  background: isActive(item.href)
                    ? 'rgba(244,196,48,0.08)'
                    : 'transparent',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
