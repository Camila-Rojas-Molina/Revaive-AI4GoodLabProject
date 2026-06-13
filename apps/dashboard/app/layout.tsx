import type { Metadata } from 'next'
import { Montserrat, Atkinson_Hyperlegible } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const atkinson = Atkinson_Hyperlegible({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Revaive',
  description: 'Cognitive recovery, together.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="teal" className={`${montserrat.variable} ${atkinson.variable}`}>
      <body style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</body>
    </html>
  )
}
