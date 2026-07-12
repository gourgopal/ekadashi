import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ekadashi Vrat — Gaudiya Vaishnava Calendar',
  description: 'Gaudiya Vaishnava Ekadashi calendar with fasting dates and parana times.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
