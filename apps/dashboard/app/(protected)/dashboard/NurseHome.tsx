'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Screen, TopBar, IconButton, BottomNav, Button, Card,
  Pill, SearchBar, EmptyState, Icon, initials, riskTone,
} from '@/components/ui'

const NURSE_NAV = [
  { href: '/dashboard', label: 'Patients', icon: 'list' },
  { href: '/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
]

type Patient = {
  id: string; name: string; age: number | null; surgery_type: string | null
  pod_risk_label: 'high' | 'medium' | 'low'; pod_risk_score: number
  sessions: { cognitive_score: number | null; session_date: string; flag_escalate: boolean; created_at: string }[]
}

export default function NurseHome({ patients }: { patients: Patient[] }) {
  const [q, setQ] = useState('')
  const router = useRouter()

  const query = q.trim().toLowerCase()
  const filtered = patients.filter(p =>
    !query || p.name.toLowerCase().includes(query) || (p.surgery_type || '').toLowerCase().includes(query))

  const counts = { low: 0, medium: 0, high: 0 }
  patients.forEach(p => counts[p.pod_risk_label]++)

  const sorted = [...filtered].sort((a, b) => {
    const aFlag = a.sessions?.some(s => s.flag_escalate) ? 0 : 1
    const bFlag = b.sessions?.some(s => s.flag_escalate) ? 0 : 1
    if (aFlag !== bFlag) return aFlag - bFlag
    const order = { high: 1, medium: 2, low: 3 } as const
    return (order[a.pod_risk_label] ?? 4) - (order[b.pod_risk_label] ?? 4)
  })

  return (
    <Screen
      topBar={
        <TopBar brand right={
          <IconButton name="bell" label="Alerts" badge onClick={() => router.push('/alerts')} />
        } />
      }
      bottomNav={<BottomNav items={NURSE_NAV} />}>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 38,
          color: 'var(--primary)', margin: '4px 0 4px' }}>
          Your patients
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', margin: 0 }}>
          Ward 4B · {patients.length} active assessment{patients.length === 1 ? '' : 's'}
        </p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search by name or procedure" />
      </div>

      {patients.length > 0 && !query && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
          {([['Low', 'good'], ['Medium', 'warn'], ['High', 'danger']] as const).map(([l, t]) => (
            <Card key={l} pad={18} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: `var(--${t === 'good' ? 'good' : t === 'warn' ? 'warn' : 'danger'})` }}>
                {counts[l.toLowerCase() as 'low' | 'medium' | 'high']}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>{l} risk</div>
            </Card>
          ))}
        </div>
      )}

      <Button full size="lg" icon="plus" onClick={() => router.push('/patients/new')}>
        New patient assessment
      </Button>
      <div style={{ height: 20 }} />

      {sorted.length === 0 ? (
        query ? (
          <EmptyState icon="search" title="No matching patients"
            sub={`Nothing matches "${q}". Check the spelling or clear the search.`}
            action={<Button variant="soft" size="md" onClick={() => setQ('')}>Clear search</Button>} />
        ) : (
          <EmptyState icon="list" title="No patients yet"
            sub="Start by adding your first patient assessment to the ward."
            action={<Button size="md" icon="plus" onClick={() => router.push('/patients/new')}>New assessment</Button>} />
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map(p => {
            const ini = initials(p.name)
            const tone = riskTone(p.pod_risk_label)
            const latest = p.sessions?.[0]
            const hasFlag = p.sessions?.some(s => s.flag_escalate)
            return (
              <Card key={p.id} onClick={() => router.push(`/patients/${p.id}`)} pad={18}
                style={{ display: 'flex', alignItems: 'center', gap: 16,
                  borderColor: hasFlag ? 'var(--danger)' : 'var(--line)' }}>
                <span style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, display: 'grid',
                  placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary)',
                  fontSize: 19, fontWeight: 800 }}>{ini}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>
                    {p.age ? `${p.age} yrs · ` : ''}{p.surgery_type ?? 'No procedure'}
                    {latest?.session_date ? ` · ${latest.session_date}` : ''}
                  </div>
                </div>
                <Pill tone={tone}>{p.pod_risk_label}</Pill>
                <Icon name="chevRight" size={22} style={{ color: 'var(--text-faint)' }} />
              </Card>
            )
          })}
        </div>
      )}
    </Screen>
  )
}
