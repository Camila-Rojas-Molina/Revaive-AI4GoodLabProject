'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getPatientPins } from './actions'
import {
  Screen, TopBar, IconButton, Button,
  SearchBar, EmptyState, KebabMenu, ConfirmDialog,
  Icon, initials,
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
      bg="linear-gradient(170deg, #F5F0E3 0%, #EAE4D2 100%)"
      topBar={
        <TopBar brand right={
          <IconButton name="bell" label="Alerts" badge onClick={() => router.push('/alerts')} />
        } />
      }
      bottomNav={
        <nav style={{
          flexShrink: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'stretch',
          padding: '10px 18px 20px', background: 'var(--surface)',
          borderTop: '1px solid var(--line)', zIndex: 20, position: 'sticky', bottom: 0,
        }}>
          {NURSE_NAV.map(it => {
            const active = it.href === '/dashboard'
            return (
              <button key={it.href} onClick={() => router.push(it.href)}
                aria-current={active ? 'page' : undefined}
                style={{
                  flex: 1, maxWidth: 150, border: 'none', background: 'transparent',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 5, padding: '8px 4px',
                }}>
                <span style={{
                  display: 'grid', placeItems: 'center', width: 64, height: 36,
                  borderRadius: 20, background: active ? '#124d47' : 'transparent',
                  color: active ? '#fff' : 'var(--text-faint)',
                }}>
                  <Icon name={it.icon} size={25} stroke={active ? 2.4 : 2} />
                </span>
                <span style={{
                  fontSize: 13, fontWeight: active ? 700 : 600,
                  color: active ? '#124d47' : 'var(--text-faint)',
                }}>
                  {it.label}
                </span>
              </button>
            )
          })}
        </nav>
      }
    >

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove patient?"
        body={`${deleteTarget?.name} will be permanently removed from Ward 4B. This action can't be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 42,
            color: '#124d47', margin: '0 0 5px', letterSpacing: '-.02em', lineHeight: 1.05,
          }}>
            Your patients
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
            {patients.length} active assessment{patients.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => router.push('/patients/new')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 999,
            background: '#124d47', color: '#F4F1E6',
            border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-ui)', flexShrink: 0, whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px -6px rgba(18,77,71,.5)',
          }}
        >
          <Icon name="plus" size={18} />
          New patient
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search by name or procedure" />
      </div>

      {/* Filter pills */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
        {filterOptions.map(o => {
          const active = filter === o.label
          const bg = active
            ? o.label === 'Low' ? '#D97706'
              : o.label === 'High' ? '#BE123C'
              : '#124d47'
            : 'rgba(255,255,255,.7)'
          return (
            <button
              key={o.label}
              onClick={() => setFilter(o.label)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 999,
                background: bg, color: active ? '#fff' : 'var(--text-muted)',
                border: active ? 'none' : '1.5px solid var(--line-strong)',
                fontSize: 14.5, fontWeight: active ? 700 : 600, cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                boxShadow: active ? '0 3px 10px -4px rgba(0,0,0,.28)' : 'none',
                transition: 'all .15s',
              }}
            >
              {o.label}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 22, height: 22, borderRadius: 11, fontSize: 12.5, fontWeight: 800, padding: '0 5px',
                background: active ? 'rgba(255,255,255,.25)' : 'var(--surface-2)',
                color: active ? '#fff' : 'var(--text-muted)',
              }}>
                {o.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Patient list */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(p => {
            const ini = initials(p.name)
            const hasFlag = p.sessions?.some(s => s.flag_escalate)
            const latestScore = p.sessions
              ?.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              ?.[0]?.cognitive_score
            const riskBg = p.pod_risk_label === 'high' ? 'rgba(190,18,60,.85)'
              : p.pod_risk_label === 'low' ? 'rgba(22,163,74,.8)'
              : 'rgba(217,119,6,.85)'
            return (
              <div
                key={p.id}
                onClick={() => router.push(`/patients/${p.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', cursor: 'pointer',
                  background: '#124d47', borderRadius: 22, overflow: 'hidden',
                  border: hasFlag ? '1.5px solid rgba(220,50,50,.6)' : '1.5px solid rgba(255,255,255,.06)',
                  boxShadow: '0 8px 28px -10px rgba(18,77,71,.5), inset 0 1px 0 rgba(255,255,255,.08)',
                  transition: 'transform .12s, box-shadow .15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = '0 14px 36px -10px rgba(18,77,71,.6), inset 0 1px 0 rgba(255,255,255,.12)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'none'
                  el.style.boxShadow = '0 8px 28px -10px rgba(18,77,71,.5), inset 0 1px 0 rgba(255,255,255,.08)'
                }}
              >
                {/* Score column */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '20px 20px 20px 24px',
                  borderRight: '1px solid rgba(255,255,255,.1)',
                  minWidth: 80, flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1,
                    fontFamily: 'var(--font-display)', letterSpacing: '-.02em',
                  }}>
                    {latestScore != null ? latestScore : '—'}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'rgba(255,255,255,.45)', marginTop: 4,
                    fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                  }}>
                    SCORE
                  </span>
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0, padding: '18px 16px 18px 20px' }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 3, lineHeight: 1.2 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.6)', lineHeight: 1.3 }}>
                    {[p.surgery_type ?? 'No procedure', p.age ? `${p.age} yrs` : null].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10.5, color: 'rgba(255,255,255,.4)', fontFamily: 'monospace',
                      background: 'rgba(255,255,255,.07)', borderRadius: 4,
                      padding: '2px 7px', letterSpacing: '.04em', userSelect: 'all',
                    }}>
                      {p.id.slice(0, 8)}
                    </span>
                    {p.profile_id && pinMap[p.profile_id] && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.85)',
                        fontFamily: 'monospace', background: 'rgba(255,255,255,.15)',
                        borderRadius: 4, padding: '2px 7px', letterSpacing: '.08em',
                      }}>
                        PIN {pinMap[p.profile_id]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Risk badge + kebab */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 0 8px', flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '6px 14px', borderRadius: 999,
                    fontSize: 12.5, fontWeight: 700,
                    background: riskBg, color: '#fff',
                  }}>
                    {p.pod_risk_label === 'medium' ? 'Moderate' : p.pod_risk_label.charAt(0).toUpperCase() + p.pod_risk_label.slice(1)}
                  </span>
                  <div style={{
                    '--surface': 'rgba(255,255,255,.12)',
                    '--text-muted': 'rgba(255,255,255,.7)',
                    '--primary-soft': 'rgba(255,255,255,.22)',
                    '--primary': '#fff',
                    '--line': 'rgba(255,255,255,.15)',
                  } as React.CSSProperties}>
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
