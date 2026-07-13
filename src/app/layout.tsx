import type { Metadata } from 'next'
import RegisterSW from '@/components/RegisterSW'

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}
