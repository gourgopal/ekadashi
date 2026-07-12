import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ekadashi Vrat — Gaudiya Vaishnava Calendar',
    short_name: 'Ekadashi',
    description:
      'Complete Gaudiya Vaishnava Ekadashi calendar with fasting dates, parana times, and Naam Jaap tracker for ISKCON devotees worldwide.',
    start_url: '/en/',
    display: 'standalone',
    background_color: '#0d0a2e',
    theme_color: '#F4C430',
    orientation: 'portrait',
    categories: ['lifestyle', 'religion', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: 'Jaap Tracker',
        short_name: 'Jaap',
        description: 'Open Naam Jaap counter',
        url: '/en/tracker/',
      },
      {
        name: 'Ekadashi Calendar',
        short_name: 'Calendar',
        description: 'View Ekadashi dates',
        url: '/en/calendar/',
      },
    ],
  }
}
