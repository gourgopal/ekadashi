import type { Metadata } from 'next'
import Link from 'next/link'
import { locales, isValidLocale, defaultLocale, type Locale } from '@/lib/i18n'
import { getDictionary } from '@/lib/get-dictionary'
import ekadashiData from '@/data/ekadashi.json'
import EkadashiCountdown from '@/components/EkadashiCountdown'
import TilakIcon from '@/components/TilakIcon'

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
    title: dict.seo.home_title,
    description: dict.seo.home_desc,
    openGraph: {
      title: dict.seo.home_title,
      description: dict.seo.home_desc,
      type: 'website',
    },
  }
}

// Flatten all ekadashis into a single array sorted by date
const allEkadashis = ekadashiData.flatMap((y) => y.ekadashis).sort(
  (a, b) => a.date.localeCompare(b.date)
)

// Pick next 4 upcoming
function getUpcoming(count = 4) {
  const today = new Date().toISOString().split('T')[0]
  return allEkadashis.filter((e) => e.date >= today).slice(0, count)
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: rawLang } = await params
  const lang: Locale = isValidLocale(rawLang) ? rawLang : defaultLocale
  const dict = await getDictionary(lang)
  const upcoming = getUpcoming(4)

  return (
    <div className="relative">
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative flex flex-col items-center justify-center px-4 pt-16 pb-12 text-center"
        style={{ minHeight: '50vh' }}
      >
        {/* Radial glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '10%', left: '50%',
            transform: 'translateX(-50%)',
            width: '600px', height: '400px',
            background: 'radial-gradient(ellipse, rgba(244,196,48,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Tilak Icon */}
        <div className="mb-6 animate-float om-glow select-none flex justify-center" aria-hidden="true">
          <span className="inline-block sm:hidden"><TilakIcon size={96} /></span>
          <span className="hidden sm:inline-block"><TilakIcon size={128} /></span>
        </div>

        {/* Hero Text */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 section-animate"
          style={{ fontFamily: 'var(--font-display)', color: '#fdf6e3' }}
        >
          {dict.home.hero_title}
        </h1>
        <p
          className="text-xl sm:text-2xl mb-4 section-animate"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#F4C430',
            fontStyle: 'italic',
            animationDelay: '0.1s',
          }}
        >
          {dict.home.hero_subtitle}
        </p>
        <p
          className="max-w-2xl text-base sm:text-lg mb-8 leading-relaxed section-animate"
          style={{ color: 'rgba(210,180,140,0.8)', animationDelay: '0.2s' }}
        >
          {dict.home.hero_desc}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-4 justify-center section-animate" style={{ animationDelay: '0.3s' }}>
          <Link
            href={`/${lang}/calendar/`}
            id="hero-calendar-btn"
            className="btn-saffron"
          >
            📅 {dict.home.view_calendar}
          </Link>
          <Link
            href={`/${lang}/tracker/`}
            id="hero-tracker-btn"
            className="px-6 py-3 rounded-full text-sm font-semibold transition-all glass"
            style={{
              color: '#fdf6e3',
              border: '1px solid rgba(244,196,48,0.25)',
            }}
          >
            📿 {dict.home.chant_now}
          </Link>
        </div>
      </section>

      {/* ── Countdown Card ────────────────────────────────────────────── */}
      <section
        id="countdown-section"
        className="max-w-3xl mx-auto px-4 mb-16"
        aria-label={dict.home.next_ekadashi}
      >
        <EkadashiCountdown
          ekadashis={allEkadashis}
          labels={{
            next_ekadashi:    dict.home.next_ekadashi,
            days:             dict.home.days,
            hours:            dict.home.hours,
            minutes:          dict.home.minutes,
            seconds:          dict.home.seconds,
            fasting_rules:    dict.home.fasting_rules,
            parana_time:      dict.home.parana_time,
            significance:     dict.home.significance,
            today_is_ekadashi: dict.home.today_is_ekadashi,
            paksha_shukla:    dict.home.paksha_shukla,
            paksha_krishna:   dict.home.paksha_krishna,
            loading:          dict.home.loading,
          }}
          lang={lang}
        />
      </section>

      {/* ── Upcoming Ekadashis ────────────────────────────────────────── */}
      <section
        id="upcoming-section"
        className="max-w-5xl mx-auto px-4 mb-20"
        aria-label={dict.home.upcoming}
      >
        <h2
          className="text-2xl sm:text-3xl font-bold text-center mb-8"
          style={{ fontFamily: 'var(--font-display)', color: '#fdf6e3' }}
        >
          {dict.home.upcoming}
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcoming.map((e, idx) => {
            const isShukla = e.paksha === 'Shukla'
            return (
              <Link
                key={e.date}
                href={`/${lang}/calendar/`}
                id={`upcoming-card-${idx}`}
                className="glass rounded-2xl p-5 card-hover block"
                style={{ textDecoration: 'none' }}
              >
                {/* Paksha badge */}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isShukla ? 'badge-shukla' : 'badge-krishna'}`}
                >
                  {isShukla ? dict.home.paksha_shukla : dict.home.paksha_krishna}
                </span>

                <h3
                  className="text-base font-bold mt-3 mb-1"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    color: '#fdf6e3',
                    lineHeight: 1.3,
                  }}
                >
                  {e.name}
                </h3>
                <p className="text-xs mb-2" style={{ color: '#F4C430' }}>
                  {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
                <p className="text-xs" style={{ color: 'rgba(210,180,140,0.6)' }}>
                  {e.month} · {e.paksha} Paksha
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Features strip ────────────────────────────────────────────── */}
      <section
        id="features-section"
        className="max-w-5xl mx-auto px-4 mb-20"
      >
        <div className="divider-saffron mb-12" />
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: '📅',
              title: 'Ekadashi Calendar',
              desc: '72 fasting days across 2026–2028 with parana times',
              href: `/${lang}/calendar/`,
              id: 'feature-calendar',
            },
            {
              icon: '📿',
              title: 'Naam Jaap Tracker',
              desc: 'Count your Hare Krishna rounds with auto-save',
              href: `/${lang}/tracker/`,
              id: 'feature-tracker',
            },
            {
              icon: '📚',
              title: 'Spiritual Resources',
              desc: 'Curated Vaishnava books and sacred items',
              href: `/${lang}/resources/`,
              id: 'feature-resources',
            },
          ].map(({ icon, title, desc, href, id }) => (
            <Link
              key={id}
              href={href}
              id={id}
              className="glass rounded-2xl p-6 card-hover flex flex-col items-center text-center"
              style={{ textDecoration: 'none' }}
            >
              <span className="text-4xl mb-4">{icon}</span>
              <h3
                className="text-lg font-bold mb-2"
                style={{ fontFamily: 'var(--font-serif)', color: '#fdf6e3' }}
              >
                {title}
              </h3>
              <p className="text-sm" style={{ color: 'rgba(210,180,140,0.7)' }}>
                {desc}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
