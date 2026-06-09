import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Revaive',
  description: 'Cognitive recovery, together.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="teal">
      <body style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</body>
    </html>
  )
}
