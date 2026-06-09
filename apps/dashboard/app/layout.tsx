import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CogBridge — Nurse Dashboard',
  description: 'Postoperative Delirium Monitoring',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="teal">
      <body style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</body>
    </html>
  )
}
