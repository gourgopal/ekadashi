import type { Metadata } from 'next'
import { locales, isValidLocale, defaultLocale, type Locale } from '@/lib/i18n'
import { getDictionary } from '@/lib/get-dictionary'
import JaapTracker from '@/components/JaapTracker'

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
    title: dict.seo.tracker_title,
    description: dict.seo.tracker_desc,
    openGraph: {
      title: dict.seo.tracker_title,
      description: dict.seo.tracker_desc,
    },
    keywords: [
      'Naam Jaap counter', 'Hare Krishna Maha-mantra', 'digital jaap mala',
      'round counter ISKCON', 'chanting rounds tracker',
    ],
  }
}

export default async function TrackerPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: rawLang } = await params
  const lang: Locale = isValidLocale(rawLang) ? rawLang : defaultLocale
  const dict = await getDictionary(lang)

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4" aria-hidden="true">📿</div>
        <h1
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-display)', color: '#fdf6e3' }}
        >
          {dict.tracker.title}
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: 'var(--font-serif)',
            color: '#F4C430',
            fontStyle: 'italic',
          }}
        >
          {dict.tracker.subtitle}
        </p>
        <div className="divider-saffron mt-6" />
      </div>

      {/* Tracker client component */}
      <JaapTracker labels={dict.tracker} />
    </div>
  )
}
