import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ekadashi: Calendar, Kirtan & Naam Jaap',
    short_name: 'Ekadashi',
    description:
      'Ekadashi fasting calendar with parana times, Naam Jaap japa counter, Kirtan audio player, and Gaudiya Vaishnava resources for ISKCON devotees worldwide.',
    id: '/',
    start_url: '/en/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    launch_handler: {
      client_mode: 'focus-existing',
    },
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
      // Monochrome badge for notification status bar (Android)
      { src: '/icons/badge.svg', sizes: '96x96', type: 'image/svg+xml' as const, purpose: 'monochrome' as const },
      { src: '/icons/badge.png', sizes: '96x96', type: 'image/png' as const, purpose: 'monochrome' as const },
    ],
    screenshots: [
      {
        src: '/screenshots/desktop.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Ekadashi Vrat — Desktop View',
      },
      {
        src: '/screenshots/mobile.png',
        sizes: '1220x2516',
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
