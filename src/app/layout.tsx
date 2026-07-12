import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ekadashi Vrat — Gaudiya Vaishnava Calendar',
  description: 'Gaudiya Vaishnava Ekadashi calendar with fasting dates and parana times.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
