import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CogBridge — Nurse Dashboard',
  description: 'Postoperative Delirium Monitoring',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
