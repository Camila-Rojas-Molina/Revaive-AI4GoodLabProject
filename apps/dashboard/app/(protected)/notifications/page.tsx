import { Screen, TopBar, BottomNav, Card, Icon } from '@/components/ui'
import Link from 'next/link'

const PATIENT_NAV = [
  { href: '/session', label: 'Home', icon: 'home' },
  { href: '/progress', label: 'Progress', icon: 'chart' },
  { href: '/profile', label: 'Profile', icon: 'user' },
]

const NOTIFS = [
  { icon: 'bell', tone: 'primary', title: "Time for today's session", body: 'Your daily 15-minute session is ready.', t: 'Just now', unread: true },
  { icon: 'spark', tone: 'good', title: 'Keep up the streak!', body: 'Consistency is paying off. Keep going.', t: '2h ago', unread: true },
  { icon: 'heart', tone: 'primary', title: 'Message from your care team', body: '"Great progress this week!"', t: 'Yesterday' },
  { icon: 'calendar', tone: 'neutral', title: 'Check-in scheduled', body: 'Video call with your care team, Fri 10:00.', t: '2 days ago' },
]

export default function NotificationsPage() {
  return (
    <Screen
      bg="#f2eee2"
      topBar={
        <TopBar title="Notifications"
          left={
            <Link href="/session" style={{ display: 'grid', placeItems: 'center', width: 50, height: 50,
              borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)',
              cursor: 'pointer', textDecoration: 'none' }}>
              <Icon name="chevLeft" size={24} />
            </Link>
          } />
      }
      bottomNav={<BottomNav items={PATIENT_NAV} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {NOTIFS.map((n, i) => (
          <Card key={i} pad={20} style={{ display: 'flex', gap: 16, alignItems: 'flex-start',
            borderColor: n.unread ? 'var(--accent-soft)' : 'var(--line)' }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, display: 'grid',
              placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Icon name={n.icon} size={24} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{n.title}</span>
                {n.unread && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
              </div>
              <p style={{ margin: '4px 0 6px', fontSize: 15.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>{n.body}</p>
              <span style={{ fontSize: 13.5, color: 'var(--text-faint)', fontWeight: 600 }}>{n.t}</span>
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  )
}
