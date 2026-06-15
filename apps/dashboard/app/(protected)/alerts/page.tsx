import { Screen, TopBar, BottomNav, Card, Icon } from '@/components/ui'

const NURSE_NAV = [
  { href: '/dashboard', label: 'Patients', icon: 'list' },
  { href: '/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/settings', label: 'Profile', icon: 'user' },
]

const ALERTS = [
  { tone: 'danger', icon: 'alert', title: 'Samuel Adebayo — High risk', body: 'New assessment flagged. Preventive bundle due.', t: '20m ago' },
  { tone: 'warn', icon: 'clock', title: 'John Mensah — re-screen due', body: '48-hour re-screen window opens today.', t: '1h ago' },
  { tone: 'good', icon: 'checkCircle', title: 'Grace Okafor — session complete', body: 'Completed daily session, score 80.', t: '3h ago' },
]

const toneVar = (t: string) =>
  t === 'good' ? 'var(--good)' : t === 'warn' ? 'var(--warn)' : 'var(--danger)'

export default function AlertsPage() {
  return (
    <Screen
      bg="#f2eee2"
      topBar={<TopBar title="Alerts" sub="Ward 4B" />}
      bottomNav={<BottomNav items={NURSE_NAV} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ALERTS.map((n, i) => {
          const tv = toneVar(n.tone)
          return (
            <Card key={i} pad={20} style={{ display: 'flex', gap: 16, alignItems: 'flex-start',
              borderLeft: `4px solid ${tv}` }}>
              <span style={{ color: tv, flexShrink: 0, marginTop: 2 }}><Icon name={n.icon} size={26} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{n.title}</div>
                <p style={{ margin: '4px 0 6px', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.45 }}>{n.body}</p>
                <span style={{ fontSize: 13.5, color: 'var(--text-faint)', fontWeight: 600 }}>{n.t}</span>
              </div>
            </Card>
          )
        })}
      </div>
    </Screen>
  )
}
