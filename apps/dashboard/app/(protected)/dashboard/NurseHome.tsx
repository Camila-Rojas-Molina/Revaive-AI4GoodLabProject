'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getPatientPins } from './actions'
import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  Screen, IconButton, Button, BottomNav,
  SearchBar, EmptyState, KebabMenu, ConfirmDialog,
  Icon,
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
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const profileIds = initial.flatMap(p => p.profile_id ? [p.profile_id] : [])
    if (profileIds.length === 0) return
    getPatientPins(profileIds).then(setPinMap)
  }, [initial])

  const query = q.trim().toLowerCase()

  const alertCount = patients.reduce((total, p) => {
    const sorted = [...(p.sessions ?? [])]
      .filter(s => s.cognitive_score != null && s.cognitive_score > 0 && s.created_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    let patientAlerts = 0
    if (p.sessions?.some(s => s.flag_escalate)) patientAlerts++
    for (let i = 0; i < sorted.length - 1; i++) {
      if ((sorted[i + 1].cognitive_score! - sorted[i].cognitive_score!) >= 20) { patientAlerts++; break }
    }
    return total + patientAlerts
  }, 0)

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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      await Promise.all([...selectedIds].map(id =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
      ))
      setPatients(list => list.filter(p => !selectedIds.has(p.id)))
      setSelectedIds(new Set())
      setSelectMode(false)
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sorted.map(p => p.id)))
    }
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  return (
    <Screen
      bg="var(--bg)"
      topBar={
        <header style={{
          position: 'sticky', top: 0, zIndex: 20, minHeight: 86,
          padding: '14px var(--pad)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          background: 'var(--surface)', borderBottom: '1px solid var(--line)',
        }}>
          <img src="/big_logo.png" alt="Revaive" style={{ height: 60, width: 'auto', display: 'block' }} />
          <IconButton name="bell" label="Alerts" badge={alertCount} onClick={() => router.push('/alerts')} />
        </header>
      }
      bottomNav={<BottomNav items={NURSE_NAV} />}
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

      {/* Page header */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30,
            color: 'var(--primary-2)', margin: '0 0 5px', letterSpacing: '-.02em', lineHeight: 1.05,
          }}>
            {selectMode ? `${selectedIds.size} selected` : 'Your patients'}
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
            {selectMode
              ? <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14.5, color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
                  {selectedIds.size === sorted.length ? 'Deselect all' : 'Select all'}
                </button>
              : `${patients.length} active assessment${patients.length === 1 ? '' : 's'}`
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {selectMode ? (
            <button
              onClick={exitSelectMode}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 22px', borderRadius: 999,
                background: 'rgba(255,255,255,0.7)', color: 'var(--primary)',
                border: '1.5px solid var(--line-strong)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => setSelectMode(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 18px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.7)', color: 'var(--primary)',
                  border: '1.5px solid var(--line-strong)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <Icon name="edit" size={17} />
                Edit
              </button>
              <button
                onClick={() => router.push('/patients/new')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 22px', borderRadius: 999,
                  background: 'var(--primary)', color: 'var(--on-primary)',
                  border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
                  boxShadow: '0 4px 16px -6px rgba(18,77,71,.5)',
                }}
              >
                <Icon name="plus" size={18} />
                New patient
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div id="nurse-search-compact" style={{ marginBottom: 8 }}>
        <style>{`
          #nurse-search-compact input {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
            font-size: 14px !important;
          }
        `}</style>
        <SearchBar value={q} onChange={setQ} placeholder="Search by name or procedure" />
      </div>

      {/* Filter pills */}
      <div style={{ marginBottom: 18, display: 'flex', gap: 6 }}>
        {filterOptions.map(o => {
          const active = filter === o.label
          const activeBg = o.label === 'Low' ? 'var(--warn)'
            : o.label === 'High' ? 'var(--danger)'
            : 'var(--primary)'
          return (
            <button
              key={o.label}
              onClick={() => setFilter(o.label)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 999,
                background: active ? activeBg : 'rgba(255,255,255,.7)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: active ? 'none' : '1.5px solid var(--line-strong)',
                fontSize: 13, fontWeight: active ? 700 : 600, cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                boxShadow: active ? '0 3px 10px -4px rgba(0,0,0,.28)' : 'none',
                transition: 'all .15s',
              }}
            >
              {o.label}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 19, height: 19, borderRadius: 10, fontSize: 11, fontWeight: 800, padding: '0 4px',
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
            const hasFlag = p.sessions?.some(s => s.flag_escalate)
            const latestScore = p.sessions
              ?.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              ?.[0]?.cognitive_score
            const scoredSessions = [...(p.sessions ?? [])]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .filter(s => s.cognitive_score != null && s.cognitive_score > 0)
            const trend = scoredSessions.length >= 2
              ? scoredSessions[0].cognitive_score! > scoredSessions[1].cognitive_score! ? 'up'
              : scoredSessions[0].cognitive_score! < scoredSessions[1].cognitive_score! ? 'down'
              : null
              : null
            const riskStyle = p.pod_risk_label === 'high'
              ? { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'high risk' }
              : p.pod_risk_label === 'low'
              ? { bg: 'var(--good-soft)', color: 'var(--primary)', label: 'low risk' }
              : { bg: 'var(--warn-soft)', color: 'var(--warn)', label: 'moderate risk' }
            const isSelected = selectedIds.has(p.id)
            return (
              <div
                key={p.id}
                onClick={() => selectMode ? toggleSelect(p.id) : router.push(`/patients/${p.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', cursor: 'pointer',
                  background: isSelected ? 'rgba(18,77,71,0.08)' : 'rgba(255,255,255,0.45)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: 22, overflow: 'hidden',
                  border: isSelected ? '1.5px solid rgba(18,77,71,0.4)' : '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 4px 20px -8px rgba(18,77,71,.2)',
                  transition: 'transform .12s, box-shadow .15s, background .1s, border-color .1s',
                }}
                onMouseEnter={e => {
                  if (selectMode) return
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = '0 8px 28px -8px rgba(18,77,71,.3)'
                }}
                onMouseLeave={e => {
                  if (selectMode) return
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'none'
                  el.style.boxShadow = '0 4px 20px -8px rgba(18,77,71,.2)'
                }}
              >
                {/* Score column */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '16px 14px 16px 18px',
                  borderRight: '1px solid var(--line)',
                  width: 92, flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: 32, fontWeight: 800, color: 'var(--primary-2)', lineHeight: 1,
                    fontFamily: 'var(--font-display)', letterSpacing: '-.02em',
                  }}>
                    {latestScore != null ? Math.round(latestScore) : '—'}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'var(--text-faint)', marginTop: 4,
                    fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                  }}>
                    SCORE
                  </span>
                  {trend === 'up' && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6,
                      fontSize: 10, fontWeight: 700, color: 'var(--good)',
                      background: 'var(--good-soft)', borderRadius: 999, padding: '3px 8px',
                    }}>
                      <TrendingUp size={10} strokeWidth={2.5} />
                      Improving
                    </span>
                  )}
                  {trend === 'down' && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6,
                      fontSize: 10, fontWeight: 700, color: 'var(--danger)',
                      background: 'var(--danger-soft)', borderRadius: 999, padding: '3px 8px',
                    }}>
                      <TrendingDown size={10} strokeWidth={2.5} />
                      Declining
                    </span>
                  )}
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0, padding: '18px 16px 18px 20px' }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 3, lineHeight: 1.2 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {[p.surgery_type ?? 'No procedure', p.age ? `${p.age} yrs` : null].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, color: 'var(--primary-2)',
                      fontFamily: 'monospace', background: 'var(--primary-soft)',
                      borderRadius: 4, padding: '2px 7px', letterSpacing: '.08em', userSelect: 'all',
                    }}>
                      {p.id.slice(0, 8)}
                    </span>
                    {p.profile_id && pinMap[p.profile_id] && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: 'var(--primary-2)',
                        fontFamily: 'monospace', background: 'var(--primary-soft)',
                        borderRadius: 4, padding: '2px 7px', letterSpacing: '.08em',
                      }}>
                        PIN {pinMap[p.profile_id]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Risk badge + kebab / checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 0 8px', flexShrink: 0 }}>
                  {selectMode ? (
                    <span style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      display: 'grid', placeItems: 'center',
                      background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.8)',
                      border: isSelected ? '2px solid var(--primary)' : '2px solid var(--line-strong)',
                      transition: 'background .12s, border-color .12s',
                    }}>
                      {isSelected && <Icon name="check" size={14} style={{ color: 'var(--on-primary)' }} />}
                    </span>
                  ) : (
                    <>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '6px 14px', borderRadius: 999,
                        fontSize: 12.5, fontWeight: 700,
                        background: riskStyle.bg, color: riskStyle.color,
                      }}>
                        {riskStyle.label}
                      </span>
                      <div onClick={e => e.stopPropagation()}>
                        <KebabMenu items={[
                          { label: 'Edit patient', icon: 'edit', onClick: () => router.push(`/patients/${p.id}/edit`) },
                          { label: 'Delete patient', icon: 'trash', danger: true, onClick: () => setDeleteTarget(p) },
                        ]} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bulk delete bar */}
      {selectMode && selectedIds.size > 0 && (
        <div style={{
          position: 'sticky', bottom: 80, zIndex: 30,
          margin: '16px 0 0',
          background: 'var(--danger)', borderRadius: 18,
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          boxShadow: '0 8px 32px -8px rgba(127,29,29,.5)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {selectedIds.size} patient{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 999,
              background: bulkDeleting ? 'rgba(255,255,255,0.3)' : '#fff',
              color: 'var(--danger)', border: 'none', fontSize: 14, fontWeight: 800,
              cursor: bulkDeleting ? 'default' : 'pointer', fontFamily: 'var(--font-ui)',
            }}
          >
            <Icon name="trash" size={16} />
            {bulkDeleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      )}
    </Screen>
  )
}
