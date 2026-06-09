'use client'

import { useState } from 'react'
import { Screen, TopBar, BottomNav, Card, Pill, LineChart, Icon } from '@/components/ui'

const PATIENT_NAV = [
  { href: '/session', label: 'Home', icon: 'home' },
  { href: '/progress', label: 'Progress', icon: 'chart' },
  { href: '/profile', label: 'Profile', icon: 'user' },
]

const DEMO_TREND = [
  { label: 'Mon', v: 62 }, { label: 'Tue', v: 65 }, { label: 'Wed', v: 61 },
  { label: 'Thu', v: 70 }, { label: 'Fri', v: 74 }, { label: 'Sat', v: 78 }, { label: 'Sun', v: 82 },
]

export default function ProgressClient({ trend, avg }: {
  trend: { label: string; v: number }[]; avg: number
}) {
  const [range, setRange] = useState('week')
  const data = trend.length > 0 ? trend : DEMO_TREND
  const displayAvg = avg > 0 ? avg : 72

  return (
    <Screen
      topBar={<TopBar title="My Progress" sub="Cognitive recovery trend" />}
      bottomNav={<BottomNav items={PATIENT_NAV} />}>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 600 }}>Weekly average</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 46, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {displayAvg}
              </span>
              <Pill tone="good"><Icon name="chart" size={14} /> improving</Pill>
            </div>
          </div>
        </div>
        <LineChart data={data} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {[['week', 'Week'], ['month', 'Month'], ['all', 'All time']].map(([id, l]) => (
            <button key={id} onClick={() => setRange(id)}
              style={{ flex: 1, minHeight: 44, borderRadius: 12, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 15,
                border: `1px solid ${range === id ? 'var(--primary)' : 'var(--line)'}`,
                background: range === id ? 'var(--primary-soft)' : 'var(--surface)',
                color: range === id ? 'var(--primary)' : 'var(--text-muted)' }}>{l}</button>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        {[['Memory', 78, 'good'], ['Attention', 71, 'good'], ['Orientation', 84, 'good'], ['Language', 66, 'warn']].map(([l, v, t]) => (
          <Card key={String(l)} pad={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{l}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{v}</span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ width: `${v}%`, height: '100%', borderRadius: 6,
                background: t === 'warn' ? 'var(--warn)' : 'var(--good)' }} />
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span style={{ width: 50, height: 50, borderRadius: 14, display: 'grid', placeItems: 'center',
          background: 'var(--primary-soft)', color: 'var(--primary)', flexShrink: 0 }}>
          <Icon name="heart" size={26} />
        </span>
        <p style={{ margin: 0, fontSize: 15.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Your care team reviews this weekly. Keep going — daily practice is the strongest signal of recovery.
        </p>
      </Card>
    </Screen>
  )
}
