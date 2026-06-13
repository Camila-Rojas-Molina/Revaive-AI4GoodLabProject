'use client'

import { useRouter } from 'next/navigation'
import { Screen, TopBar, IconButton, BottomNav, Card, Icon } from '@/components/ui'

const PATIENT_NAV = [
  { href: '/session', label: 'Home', icon: 'home' },
  { href: '/profile', label: 'Profile', icon: 'user' },
]

export default function PatientHomeClient({ patientId, firstName, greeting, todayDone }: {
  patientId: string; firstName: string; greeting: string; todayDone: boolean
}) {
  const router = useRouter()

  return (
    <Screen
      topBar={
        <TopBar brand right={
          <IconButton name="bell" label="Notifications" onClick={() => router.push('/notifications')} />
        } />
      }
      bottomNav={<BottomNav items={PATIENT_NAV} />}>

      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 46, lineHeight: 1.05,
          color: 'var(--primary)', margin: '8px 0 10px', letterSpacing: '-.01em' }}>
          {greeting},<br />{firstName}
        </h1>
        <p style={{ fontSize: 19, color: 'var(--text-muted)', margin: 0 }}>
          {todayDone ? "Great work today!" : "Ready for your recovery session?"}
        </p>
      </div>

      {todayDone ? (
        <Card style={{ textAlign: 'center', marginBottom: 26, padding: '40px 30px' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 90, height: 90,
            borderRadius: '50%', margin: '0 auto 20px',
            background: 'color-mix(in srgb, var(--good) 16%, var(--surface))', color: 'var(--good)' }}>
            <Icon name="checkCircle" size={52} stroke={2.2} />
          </span>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
            Session complete!
          </div>
          <p style={{ fontSize: 17, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            You finished today's session. See you tomorrow!
          </p>
        </Card>
      ) : (
        <button onClick={() => router.push(`/session/active?patientId=${patientId}`)}
          aria-label="Start daily session"
          style={{ width: '100%', border: 'none', cursor: 'pointer', padding: 0,
            background: 'none', borderRadius: 'var(--r-xl)', marginBottom: 26 }}>
          <div style={{ borderRadius: 'var(--r-xl)', padding: 7, background: 'var(--accent-soft)' }}>
            <div style={{ borderRadius: 28,
              background: 'linear-gradient(160deg,var(--primary-2),var(--primary))',
              color: 'var(--on-primary)', padding: '54px 30px 44px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ position: 'relative', display: 'grid', placeItems: 'center', marginBottom: 26 }}>
                <span style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,.25)', animation: 'cbPing 2.6s ease-out infinite' }} />
                <span style={{ width: 104, height: 104, borderRadius: '50%', background: 'rgba(255,255,255,.16)',
                  display: 'grid', placeItems: 'center' }}>
                  <span style={{ width: 74, height: 74, borderRadius: '50%', background: 'var(--on-primary)',
                    color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
                    <Icon name="play" size={36} />
                  </span>
                </span>
              </span>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.01em' }}>Start Daily Session</div>
              <div style={{ fontSize: 14.5, letterSpacing: '.14em', marginTop: 10, opacity: .8, fontWeight: 600 }}>
                15 MINUTES ESTIMATED
              </div>
            </div>
          </div>
        </button>
      )}

    </Screen>
  )
}
