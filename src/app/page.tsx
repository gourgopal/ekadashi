import { redirect } from 'next/navigation'

/**
 * Root page — redirect to default locale (/en/).
 * For static export this generates a root index.html that
 * JS-redirects to /en/ on the client.
 */
export default function RootPage() {
  redirect('/en/')
}
