import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ekadashi Vrat — Gaudiya Vaishnava Calendar',
    short_name: 'Ekadashi',
    description:
      'Complete Gaudiya Vaishnava Ekadashi calendar with fasting dates, parana times, and Naam Jaap tracker for ISKCON devotees worldwide.',
    id: '/',
    start_url: '/en/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#0d0a2e',
    theme_color: '#F4C430',
    orientation: 'portrait',
    lang: 'en',
    dir: 'ltr',
    categories: ['lifestyle', 'religion', 'utilities'],
    icons: [
      ...[48, 72, 96, 128, 144, 152].flatMap((s) => [
        { src: `/icons/icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' as const, purpose: 'any' as const },
      ]),
      ...[192, 384, 512].flatMap((s) => [
        { src: `/icons/icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' as const, purpose: 'any' as const },
        { src: `/icons/icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' as const, purpose: 'maskable' as const },
      ]),
    ],
    screenshots: [
      {
        src: '/screenshots/desktop.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Ekadashi Vrat — Desktop View',
      },
      {
        src: '/screenshots/mobile.png',
        sizes: '720x1280',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Ekadashi Vrat — Mobile View',
      },
    ],
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
