import type { Metadata } from 'next'
import { locales, isValidLocale, defaultLocale, type Locale } from '@/lib/i18n'
import { getDictionary } from '@/lib/get-dictionary'

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
    title: dict.seo.resources_title,
    description: dict.seo.resources_desc,
    openGraph: {
      title: dict.seo.resources_title,
      description: dict.seo.resources_desc,
    },
    keywords: [
      'Ekadashi Vrat Katha', 'ISKCON books', 'Srila Prabhupada', 'Vedic books',
      'Vaishnava spiritual resources', 'Ekadashi dry fruits', 'fasting food',
    ],
  }
}

interface Product {
  id: string
  title: string
  description: string
  category: string
  emoji: string
  affiliateUrl: string
  badge?: string
}

const PRODUCTS: Product[] = [
  {
    id: 'ekadashi-vrat-katha-hindi',
    title: 'Ekadashi Vrat Katha (Hindi)',
    description:
      'Classic Hindi compilation of all 24 Ekadashi stories with their significance, fasting rules, and parana vidhi. Essential for every Vaishnava household.',
    category: 'Book',
    emoji: '📖',
    affiliateUrl: 'https://www.amazon.in/dp/9356287716?tag=evtime-21',
    badge: 'Bestseller',
  },
  {
    id: 'ekadashi-vrat-kathaye-big',
    title: 'Ekadashi Vrat Kathaye (Big Size)',
    description:
      'Large-print edition of all Ekadashi Vrat Kathas. Perfect for reading aloud during satsang or group fasting observances. Includes Sanskrit shlokas.',
    category: 'Book',
    emoji: '📚',
    affiliateUrl: 'https://www.amazon.in/dp/B0CGNY8395?tag=evtime-21',
  },
  {
    id: 'krishna-stories-prabhupada',
    title: 'Lord Krishna Stories by Srila Prabhupada',
    description:
      'Timeless stories of Lord Krishna from the Srimad Bhagavatam as narrated by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada. Transformative reading.',
    category: 'ISKCON Book',
    emoji: '🪷',
    affiliateUrl: 'https://www.amazon.in/dp/B07L6BJN1C?tag=evtime-21',
    badge: 'Must Read',
  },
  {
    id: 'vedic-wisdom-iskcon-set',
    title: 'Set of 32 Vedic Wisdom ISKCON Books',
    description:
      'Comprehensive library of 32 ISKCON publications covering the Bhagavad Gita, Srimad Bhagavatam, Chaitanya Charitamrita, and other essential Vaishnava texts.',
    category: 'ISKCON Collection',
    emoji: '🏛️',
    affiliateUrl: 'https://www.amazon.in/dp/B08BKSY4NM?tag=evtime-21',
    badge: 'Best Value',
  },
  {
    id: 'ekadashi-stories-rhyme',
    title: 'Ekadashi: Stories in Rhyme',
    description:
      'Beautifully illustrated Ekadashi stories in rhyme form — ideal for children and families. Makes learning Vaishnava traditions joyful and memorable.',
    category: 'Book',
    emoji: '🎭',
    affiliateUrl: 'https://www.amazon.in/dp/9358962518?tag=evtime-21',
  },
  {
    id: 'ekadashi-dry-fruits',
    title: 'Ekadashi Dry Fruits Assortment',
    description:
      'Premium quality mixed dry fruits suitable for Ekadashi fasting — almonds, cashews, raisins, walnuts, and pistachios. Pure, natural, and grain-free.',
    category: 'Fasting Food',
    emoji: '🥜',
    affiliateUrl: 'https://www.amazon.in/s?k=dry+fruits&tag=evtime-21',
    badge: 'Ekadashi Approved',
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  'Book':             'rgba(244,196,48,0.15)',
  'ISKCON Book':      'rgba(100,120,255,0.15)',
  'ISKCON Collection':'rgba(180,100,255,0.15)',
  'Fasting Food':     'rgba(100,200,100,0.15)',
}
const CATEGORY_TEXT: Record<string, string> = {
  'Book':             '#F4C430',
  'ISKCON Book':      '#a0aaf5',
  'ISKCON Collection':'#c4a0f5',
  'Fasting Food':     '#8fdf8f',
}

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: rawLang } = await params
  const lang: Locale = isValidLocale(rawLang) ? rawLang : defaultLocale
  const dict = await getDictionary(lang)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-5xl mb-4" aria-hidden="true">🕌</div>
        <h1
          className="text-3xl sm:text-4xl font-bold mb-3"
          style={{ fontFamily: 'var(--font-display)', color: '#fdf6e3' }}
        >
          {dict.resources.title}
        </h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'rgba(210,180,140,0.7)' }}>
          {dict.resources.subtitle}
        </p>
        <div className="divider-saffron mt-8" />
      </div>

      {/* Product grid */}
      <div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        id="resources-grid"
      >
        {PRODUCTS.map((product) => (
          <article
            key={product.id}
            id={`product-${product.id}`}
            className="glass rounded-3xl overflow-hidden card-hover flex flex-col"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Product visual header */}
            <div
              className="relative flex items-center justify-center py-10"
              style={{
                background: `radial-gradient(circle at center, ${CATEGORY_COLORS[product.category] ?? 'rgba(244,196,48,0.08)'} 0%, transparent 70%)`,
              }}
            >
              <span className="text-7xl select-none" aria-hidden="true">
                {product.emoji}
              </span>

              {product.badge && (
                <span
                  className="absolute top-4 right-4 text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{
                    background: 'rgba(244,196,48,0.2)',
                    border: '1px solid rgba(244,196,48,0.4)',
                    color: '#F4C430',
                  }}
                >
                  {product.badge}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
              {/* Category */}
              <span
                className="text-xs font-semibold uppercase tracking-wider mb-2 px-2 py-0.5 rounded-full w-fit"
                style={{
                  background: CATEGORY_COLORS[product.category] ?? 'rgba(244,196,48,0.1)',
                  color: CATEGORY_TEXT[product.category] ?? '#F4C430',
                  border: `1px solid ${CATEGORY_TEXT[product.category] ?? '#F4C430'}44`,
                }}
              >
                {product.category}
              </span>

              {/* Title */}
              <h2
                className="text-lg font-bold mb-2 leading-snug"
                style={{ fontFamily: 'var(--font-serif)', color: '#fdf6e3' }}
              >
                {product.title}
              </h2>

              {/* Description */}
              <p
                className="text-sm leading-relaxed flex-1 mb-5"
                style={{ color: 'rgba(210,180,140,0.75)' }}
              >
                {product.description}
              </p>

              {/* CTA */}
              <a
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                id={`buy-${product.id}`}
                className="btn-saffron justify-center text-sm"
                aria-label={`${dict.resources.buy_now}: ${product.title}`}
              >
                <span>🛒</span>
                {dict.resources.buy_now}
              </a>
            </div>
          </article>
        ))}
      </div>

      {/* Affiliate disclosure */}
      <p
        className="text-center text-xs mt-12 max-w-lg mx-auto"
        style={{ color: 'rgba(210,180,140,0.35)' }}
      >
        {dict.resources.affiliate_note}
      </p>
    </div>
  )
}
