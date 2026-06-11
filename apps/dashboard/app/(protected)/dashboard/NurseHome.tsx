'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Screen, TopBar, IconButton, BottomNav, Button, Card,
  Pill, SearchBar, EmptyState, Icon, FilterChips, KebabMenu, ConfirmDialog,
  initials, riskTone,
} from '@/components/ui'

const NURSE_NAV = [
  { href: '/dashboard', label: 'Patients', icon: 'list' },
  { href: '/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/settings', label: 'Profile', icon: 'user' },
]

type Patient = {
  id: string; name: string; age: number | null; surgery_type: string | null
  pod_risk_label: 'high' | 'medium' | 'low'; pod_risk_score: number
  sessions: { cognitive_score: number | null; session_date: string; flag_escalate: boolean; created_at: string }[]
}

const FILTER_LABELS = ['All', 'Low', 'Moderate', 'High']

export default function NurseHome({ patients: initial }: { patients: Patient[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [patients, setPatients] = useState(initial)
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const query = q.trim().toLowerCase()

  const counts = { low: 0, medium: 0, high: 0 }
  patients.forEach(p => counts[p.pod_risk_label]++)

  const filterOptions = [
    { label: 'All', count: patients.length },
    { label: 'Low', count: counts.low },
    { label: 'Moderate', count: counts.medium },
    { label: 'High', count: counts.high },
  ]

  const filtered = patients.filter(p => {
    const matchQ = !query || p.name.toLowerCase().includes(query) || (p.surgery_type || '').toLowerCase().includes(query)
    const matchF = filter === 'All'
      || (filter === 'Low' && p.pod_risk_label === 'low')
      || (filter === 'Moderate' && p.pod_risk_label === 'medium')
      || (filter === 'High' && p.pod_risk_label === 'high')
    return matchQ && matchF
  })

  const sorted = [...filtered].sort((a, b) => {
    const aFlag = a.sessions?.some(s => s.flag_escalate) ? 0 : 1
    const bFlag = b.sessions?.some(s => s.flag_escalate) ? 0 : 1
    if (aFlag !== bFlag) return aFlag - bFlag
    const order = { high: 1, medium: 2, low: 3 } as const
    return (order[a.pod_risk_label] ?? 4) - (order[b.pod_risk_label] ?? 4)
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        setPatients(list => list.filter(p => p.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Screen
      topBar={
        <TopBar brand right={
          <IconButton name="bell" label="Alerts" badge onClick={() => router.push('/alerts')} />
        } />
      }
      bottomNav={<BottomNav items={NURSE_NAV} />}>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove patient?"
        body={`${deleteTarget?.name} will be permanently removed from Ward 4B. This action can't be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 38,
          color: 'var(--primary)', margin: '4px 0 4px' }}>
          Your patients
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', margin: 0 }}>
          Ward 4B · {patients.length} active assessment{patients.length === 1 ? '' : 's'}
        </p>
      </div>

      <div style={{ marginBottom: 14 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search by name or procedure" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <FilterChips value={filter} onChange={setFilter} options={filterOptions} />
      </div>

      <Button full size="lg" icon="plus" onClick={() => router.push('/patients/new')}>
        New patient assessment
      </Button>
      <div style={{ height: 20 }} />

      {sorted.length === 0 ? (
        query || filter !== 'All' ? (
          <EmptyState icon="search" title="No matching patients"
            sub={query ? `Nothing matches "${q}".` : `No ${filter.toLowerCase()} risk patients.`}
            action={<Button variant="soft" size="md" onClick={() => { setQ(''); setFilter('All') }}>Clear filters</Button>} />
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
            const hasFlag = p.sessions?.some(s => s.flag_escalate)
            const latestScore = p.sessions
              ?.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              ?.[0]?.cognitive_score
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
                    {latestScore != null ? ` · score ${latestScore}` : ''}
                  </div>
                </div>
                <Pill tone={tone}>
                  {p.pod_risk_label === 'medium' ? 'Moderate' : p.pod_risk_label.charAt(0).toUpperCase() + p.pod_risk_label.slice(1)}
                </Pill>
                <KebabMenu items={[
                  { label: 'Edit patient', icon: 'edit', onClick: () => router.push(`/patients/${p.id}/edit`) },
                  { label: 'Delete patient', icon: 'trash', danger: true, onClick: () => setDeleteTarget(p) },
                ]} />
              </Card>
            )
          })}
        </div>
      )}
    </Screen>
  )
}
