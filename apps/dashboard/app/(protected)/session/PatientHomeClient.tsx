'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Screen, IconButton, Icon, BottomNav } from '@/components/ui'

const PATIENT_NAV = [
  { href: '/session', label: 'Home', icon: 'home' },
  { href: '/profile', label: 'Profile', icon: 'user' },
]

export default function PatientHomeClient({ patientId, firstName, greeting, todayDone }: {
  patientId: string; firstName: string; greeting: string; todayDone: boolean
}) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)

  return (
    <Screen
      bg="#f2eee2"
      topBar={
        <header style={{
          position: 'sticky', top: 0, zIndex: 20, minHeight: 86,
          padding: '14px var(--pad)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          background: 'var(--surface)', borderBottom: '1px solid var(--line)',
        }}>
          <img src="/big_logo.png" alt="Revaive" style={{ height: 60, width: 'auto', display: 'block' }} />
          <IconButton name="bell" label="Notifications" onClick={() => router.push('/notifications')} />
        </header>
      }
      bottomNav={<BottomNav items={PATIENT_NAV} />}>

      <div style={{ marginBottom: 48, textAlign: 'center', paddingTop: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 44,
          color: '#124d47', margin: '0 0 10px', letterSpacing: '-.02em', lineHeight: 1.1,
        }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(18,77,71,0.6)', margin: 0, fontWeight: 500 }}>
          {todayDone ? 'Great work today!' : 'Ready for your recovery session?'}
        </p>
      </div>

      {todayDone ? (
        <div style={{
          background: '#124d47', borderRadius: 24,
          boxShadow: '0 8px 32px -8px rgba(18,77,71,.4)',
          padding: '44px 32px', textAlign: 'center', marginBottom: 24,
        }}>
          <span style={{
            display: 'grid', placeItems: 'center', width: 80, height: 80, borderRadius: '50%',
            margin: '0 auto 22px', background: 'rgba(255,255,255,0.15)', color: '#fff',
          }}>
            <Icon name="checkCircle" size={44} stroke={2.2} />
          </span>
          <div style={{
            fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 10,
            fontFamily: 'var(--font-display)', letterSpacing: '-.02em',
          }}>
            Session complete!
          </div>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.5 }}>
            You finished today&apos;s session. See you tomorrow!
          </p>
        </div>
      ) : (
        <button
          onClick={() => router.push(`/session/active?patientId=${patientId}`)}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onTouchStart={() => setPressed(true)}
          onTouchEnd={() => setPressed(false)}
          aria-label="Start daily session"
          style={{
            width: '100%', border: 'none', cursor: 'pointer',
            background: pressed ? '#0d3832' : '#124d47', borderRadius: 24,
            boxShadow: pressed ? '0 2px 8px -4px rgba(18,77,71,.3)' : '0 8px 32px -8px rgba(18,77,71,.45)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '50px 32px 44px', marginBottom: 24,
            transform: pressed ? 'scale(0.97)' : 'scale(1)',
            transition: 'transform .12s ease, box-shadow .12s ease, background .12s ease',
          }}>
          <span style={{ position: 'relative', display: 'grid', placeItems: 'center', marginBottom: 28 }}>
            <span style={{
              position: 'absolute', width: 126, height: 126, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,.22)', animation: 'cbPing 2.6s ease-out infinite',
            }} />
            <span style={{
              width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.13)',
              display: 'grid', placeItems: 'center',
            }}>
              <span style={{
                width: 70, height: 70, borderRadius: '50%', background: '#fff',
                color: '#124d47', display: 'grid', placeItems: 'center',
              }}>
                <Icon name="play" size={34} />
              </span>
            </span>
          </span>
          <div style={{
            fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-.01em',
            fontFamily: 'var(--font-display)', marginBottom: 8,
          }}>
            Start Daily Session
          </div>
          <div style={{
            fontSize: 13, letterSpacing: '.12em', color: 'rgba(255,255,255,0.55)',
            fontWeight: 700, textTransform: 'uppercase',
          }}>
            15 minutes estimated
          </div>
        </button>
      )}

    </Screen>
  )
}
