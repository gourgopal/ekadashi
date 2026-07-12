import type { Metadata } from 'next'
import { locales, isValidLocale, defaultLocale, type Locale } from '@/lib/i18n'
import { getDictionary } from '@/lib/get-dictionary'
import ekadashiData from '@/data/ekadashi.json'
import CalendarScroll from '@/components/CalendarScroll'

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
    title: dict.seo.calendar_title,
    description: dict.seo.calendar_desc,
    openGraph: {
      title: dict.seo.calendar_title,
      description: dict.seo.calendar_desc,
    },
    keywords: [
      'Ekadashi 2026', 'Ekadashi 2027', 'Ekadashi 2028',
      'Vaishnava fasting calendar', 'ISKCON Ekadashi dates',
      'parana time', 'Gaudiya Vaishnava calendar',
    ],
  }
}

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: rawLang } = await params
  const lang: Locale = isValidLocale(rawLang) ? rawLang : defaultLocale
  const dict = await getDictionary(lang)

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <CalendarScroll />
      {/* Page header */}
      <div className="text-center mb-12">
        <div
          className="text-5xl mb-4"
          style={{ color: '#F4C430' }}
          aria-hidden="true"
        >
          📅
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold mb-3"
          style={{ fontFamily: 'var(--font-display)', color: '#fdf6e3' }}
        >
          {dict.calendar.title}
        </h1>
        <p className="text-base" style={{ color: 'rgba(210,180,140,0.7)' }}>
          {dict.calendar.description}
        </p>
        <div className="divider-saffron mt-8" />
      </div>

      {/* Year sections */}
      {ekadashiData.map((yearData) => (
        <section
          key={yearData.year}
          id={`year-${yearData.year}`}
          className="mb-16"
          aria-label={`Ekadashi ${yearData.year}`}
        >
          {/* Year header */}
          <div className="flex items-center gap-4 mb-8">
            <div
              className="text-4xl font-bold"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#F4C430',
                textShadow: '0 0 20px rgba(244,196,48,0.3)',
              }}
            >
              {yearData.year}
            </div>
            <div className="flex-1 divider-saffron" />
            <div
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: 'rgba(244,196,48,0.1)',
                border: '1px solid rgba(244,196,48,0.2)',
                color: '#F4C430',
              }}
            >
              {yearData.ekadashis.length} Ekadashis
            </div>
          </div>

          {/* Ekadashi cards grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {yearData.ekadashis.map((e, idx) => {
              const today = new Date().toISOString().split('T')[0]
              const isPast = e.date < today
              const isToday = e.date === today
              const isShukla = e.paksha === 'Shukla'
              const dateObj = new Date(e.date + 'T00:00:00')

              return (
                <article
                  key={e.date}
                  id={`ekadashi-${e.date}`}
                  className="glass rounded-2xl overflow-hidden card-hover"
                  style={{
                    opacity: isPast ? 0.55 : 1,
                    border: isToday
                      ? '1px solid rgba(244,196,48,0.6)'
                      : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: isToday
                      ? '0 0 24px rgba(244,196,48,0.2)'
                      : 'none',
                  }}
                >
                  {/* Card header */}
                  <div
                    className="px-4 pt-4 pb-3 flex items-start justify-between gap-2"
                    style={{
                      background: isShukla
                        ? 'rgba(244,196,48,0.06)'
                        : 'rgba(25,25,112,0.2)',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-bold text-sm leading-snug mb-0.5 truncate"
                        style={{
                          fontFamily: 'var(--font-serif)',
                          color: isToday ? '#F4C430' : '#fdf6e3',
                        }}
                      >
                        {isToday && '🪔 '}
                        {e.name}
                      </h3>
                      <p
                        className="text-xs"
                        style={{ color: 'rgba(210,180,140,0.6)' }}
                      >
                        {e.month}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${isShukla ? 'badge-shukla' : 'badge-krishna'}`}
                    >
                      {isShukla ? 'Shukla' : 'Krishna'}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <time
                      dateTime={e.date}
                      className="text-base font-bold"
                      style={{ color: '#F4C430', fontFamily: 'var(--font-serif)' }}
                    >
                      {dateObj.toLocaleDateString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </time>
                  </div>

                  {/* Parana */}
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div
                      className="text-xs uppercase tracking-wider mb-1 font-semibold"
                      style={{ color: 'rgba(244,196,48,0.7)' }}
                    >
                      🕐 {dict.calendar.parana}
                    </div>
                    <div className="text-sm font-medium" style={{ color: '#fdf6e3' }}>
                      {e.parana_start} – {e.parana_end}
                    </div>
                  </div>

                  {/* Fasting rules */}
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div
                      className="text-xs uppercase tracking-wider mb-1 font-semibold"
                      style={{ color: 'rgba(244,196,48,0.7)' }}
                    >
                      🌿 Fasting
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(210,180,140,0.75)' }}>
                      {e.fasting_rules}
                    </p>
                  </div>

                  {/* Significance */}
                  <div className="px-4 py-3">
                    <div
                      className="text-xs uppercase tracking-wider mb-1 font-semibold"
                      style={{ color: 'rgba(244,196,48,0.7)' }}
                    >
                      📿 Significance
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(210,180,140,0.75)' }}>
                      {e.significance}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}

      {/* Footer note */}
      <div
        className="text-center mt-8 pt-8 text-xs"
        style={{ color: 'rgba(210,180,140,0.4)', borderTop: '1px solid rgba(244,196,48,0.1)' }}
      >
        All dates follow the Gaudiya Vaishnava / ISKCON calendar tradition.
        Parana times are approximate (IST). Consult your local temple for exact timings.
      </div>
    </div>
  )
}
