import type { Metadata } from 'next'
import { locales, isValidLocale, defaultLocale, type Locale } from '@/lib/i18n'
import { getDictionary } from '@/lib/get-dictionary'
import Navigation from '@/components/Navigation'
import KirtanPlayer from '@/components/KirtanPlayer'
import RegisterSW from '@/components/RegisterSW'
import '../globals.css'

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang: rawLang } = await params
  const lang: Locale = isValidLocale(rawLang) ? rawLang : defaultLocale
  const dict = await getDictionary(lang)
  return {
    title: {
      template: `%s | ${dict.seo.site_name}`,
      default: dict.seo.home_title,
    },
    description: dict.seo.home_desc,
    metadataBase: new URL('https://ekadashi.pages.dev'),
    alternates: {
      canonical: `/${lang}/`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `/${l}/`])
      ),
    },
    openGraph: {
      type: 'website',
      siteName: dict.seo.site_name,
      locale: lang,
    },
    twitter: {
      card: 'summary_large_image',
    },
    keywords: [
      'Ekadashi', 'ISKCON', 'Gaudiya Vaishnava', 'fasting', 'Ekadashi 2026',
      'Vaishnava calendar', 'Hare Krishna', 'parana time', 'Naam Jaap',
    ],
  }
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang: rawLang } = await params
  const lang: Locale = isValidLocale(rawLang) ? rawLang : defaultLocale
  const dict = await getDictionary(lang)

  return (
    <>
      {/* Stars background (pure CSS, rendered server-side) */}
      <div className="stars-bg" aria-hidden="true">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left:  `${Math.random() * 100}%`,
              top:   `${Math.random() * 100}%`,
              width:  `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              opacity: Math.random() * 0.6 + 0.1,
            }}
          />
        ))}
      </div>

      <Navigation lang={lang} dict={dict} />

      <main className="page-body">
        {children}
      </main>

      <KirtanPlayer
        nowPlayingLabel={dict.player.now_playing}
        playLabel={dict.player.play}
        pauseLabel={dict.player.pause}
        volumeLabel={dict.player.volume}
      />

      <RegisterSW />
    </>
  )
}
