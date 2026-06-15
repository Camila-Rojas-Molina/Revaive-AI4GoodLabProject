'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getPatientPins } from './actions'
import {
  Screen, TopBar, IconButton, BottomNav, Button, Card,
  Pill, SearchBar, EmptyState, FilterChips, KebabMenu, ConfirmDialog,
  Icon, initials, riskTone,
} from '@/components/ui'

const NURSE_NAV = [
  { href: '/dashboard', label: 'Patients', icon: 'list' },
  { href: '/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/settings', label: 'Profile', icon: 'user' },
]

type Patient = {
  id: string; name: string; age: number | null; surgery_type: string | null
  pod_risk_label: 'high' | 'medium' | 'low'; pod_risk_score: number
  profile_id?: string | null
  sessions: { cognitive_score: number | null; session_date: string; flag_escalate: boolean; created_at: string }[]
}


export default function NurseHome({ patients: initial }: { patients: Patient[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [patients, setPatients] = useState(initial)
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pinMap, setPinMap] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    const profileIds = initial.flatMap(p => p.profile_id ? [p.profile_id] : [])
    if (profileIds.length === 0) return
    getPatientPins(profileIds).then(setPinMap)
  }, [initial])

  const query = q.trim().toLowerCase()

  const counts = { low: 0, medium: 0, high: 0 }
  patients.forEach(p => counts[p.pod_risk_label]++)

  const filterOptions = [
    { label: 'All', count: patients.length },
    { label: 'Low', count: counts.low },
    { label: 'High', count: counts.high },
  ]

  const filtered = patients.filter(p => {
    const matchQ = !query || p.name.toLowerCase().includes(query) || (p.surgery_type || '').toLowerCase().includes(query)
    const matchF = filter === 'All'
      || (filter === 'Low' && p.pod_risk_label === 'low')
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

      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34,
            color: 'var(--primary)', margin: '0 0 3px', letterSpacing: '-.01em' }}>
            Your patients
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
            {patients.length} active assessment{patients.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => router.push('/patients/new')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 16px', borderRadius: 12,
            background: 'var(--primary-soft)', color: 'var(--primary)',
            border: '1.5px solid transparent',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-ui)', flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Icon name="plus" size={17} />
          New patient
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search by name or procedure" />
      </div>

      <div style={{ marginBottom: 22 }}>
        <FilterChips value={filter} onChange={setFilter} options={filterOptions} />
      </div>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(p => {
            const ini = initials(p.name)
            const tone = riskTone(p.pod_risk_label)
            const hasFlag = p.sessions?.some(s => s.flag_escalate)
            const latestScore = p.sessions
              ?.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              ?.[0]?.cognitive_score
            const accentColor = p.pod_risk_label === 'high' ? 'var(--danger)'
              : p.pod_risk_label === 'low' ? 'var(--good)'
              : 'var(--warn)'
            return (
              <div
                key={p.id}
                onClick={() => router.push(`/patients/${p.id}`)}
                style={{
                  display: 'flex', overflow: 'hidden', cursor: 'pointer',
                  background: 'var(--surface)', borderRadius: 'var(--r-md)',
                  border: `1px solid ${hasFlag ? 'color-mix(in srgb, var(--danger) 30%, var(--line))' : 'var(--line)'}`,
                  boxShadow: '0 1px 3px rgba(16,46,44,.04), 0 6px 16px -8px rgba(16,46,44,.12)',
                  transition: 'transform .12s, box-shadow .15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'translateY(-1px)'
                  el.style.boxShadow = '0 4px 12px -4px rgba(16,46,44,.12), 0 16px 32px -8px rgba(16,46,44,.16)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'none'
                  el.style.boxShadow = '0 1px 3px rgba(16,46,44,.04), 0 6px 16px -8px rgba(16,46,44,.12)'
                }}
              >
                {/* Risk accent strip */}
                <div style={{ width: 4, flexShrink: 0, background: accentColor }} />

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '15px 14px 15px 16px' }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 11, flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    background: 'var(--primary-soft)', color: 'var(--primary)',
                    fontSize: 15, fontWeight: 800, letterSpacing: '-.01em',
                  }}>
                    {ini}
                  </div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2, lineHeight: 1.2 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {[p.surgery_type ?? 'No procedure', p.age ? `${p.age} yrs` : null, latestScore != null ? `Score ${latestScore}` : null].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, color: 'var(--text-faint)', fontFamily: 'monospace',
                        background: 'var(--surface-2)', borderRadius: 4, padding: '2px 6px',
                        letterSpacing: '.04em', userSelect: 'all',
                      }}>
                        {p.id.slice(0, 8)}
                      </span>
                      {p.profile_id && pinMap[p.profile_id] && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace',
                          background: 'var(--primary-soft)', borderRadius: 4,
                          padding: '2px 6px', letterSpacing: '.08em',
                        }}>
                          PIN {pinMap[p.profile_id]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: risk pill + kebab */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Pill tone={tone}>
                      {p.pod_risk_label === 'medium' ? 'Moderate' : p.pod_risk_label.charAt(0).toUpperCase() + p.pod_risk_label.slice(1)}
                    </Pill>
                    <KebabMenu items={[
                      { label: 'Edit patient', icon: 'edit', onClick: () => router.push(`/patients/${p.id}/edit`) },
                      { label: 'Delete patient', icon: 'trash', danger: true, onClick: () => setDeleteTarget(p) },
                    ]} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Screen>
  )
}
