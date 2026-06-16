'use client'

import { useRouter } from 'next/navigation'
import { Screen, TopBar, IconButton } from '@/components/ui'

export default function NotificationsPage() {
  const router = useRouter()

  return (
    <Screen
      bg="var(--bg)"
      topBar={
        <TopBar
          title="Notifications"
          left={<IconButton name="chevLeft" label="Back" onClick={() => router.back()} />}
        />
      }
    >
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', gap: 16, textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(18,77,71,0.08)',
          display: 'grid', placeItems: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="rgba(18,77,71,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
          No notifications
        </p>
        <p style={{ fontSize: 14.5, color: 'var(--text-faint)', margin: 0 }}>
          You're all caught up!
        </p>
      </div>
    </Screen>
  )
}
