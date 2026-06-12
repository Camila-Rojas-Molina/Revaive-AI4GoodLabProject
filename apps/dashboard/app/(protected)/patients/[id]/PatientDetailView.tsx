'use client'

import { useState, useEffect } from 'react'
import { getPatientPins } from '../../dashboard/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Screen, TopBar, IconButton, Card, Pill, LineChart, Icon,
  KebabMenu, ConfirmDialog, Button,
  initials, riskTone, toneVar,
} from '@/components/ui'

const CST_DOMAINS: { key: string; label: string }[] = [
  { key: 'orientation',               label: 'Orientation' },
  { key: 'reminiscence',              label: 'Reminiscence' },
  { key: 'language_and_word_fluency', label: 'Language & word fluency' },
  { key: 'attention_and_numbers',     label: 'Attention & numbers' },
  { key: 'abstraction_and_reasoning', label: 'Abstraction & reasoning' },
  { key: 'sensory_and_creativity',    label: 'Sensory & creativity' },
]

// The three factors shown in each session report card.
// Keys match what the voice pipeline stores in component_scores.
const FACTORS = [
  { key: 'latency',          label: 'Response speed'  },
  { key: 'type_token_ratio', label: 'Recall accuracy' },
  { key: 'coherence',        label: 'Orientation'     },
] as const

type ComponentScores = {
  coherence?: number | null
  type_token_ratio?: number | null
  latency?: number | null
  speech_rate?: number | null
  lexical_complex?: number | null
}

type Session = {
  id?: string
  cognitive_score: number | null
  session_date: string
  flag_escalate: boolean
  transcript?: string
  theme?: string
  duration_seconds?: number
  component_scores?: ComponentScores
}

type Patient = {
  id: string; name: string; age: number | null; sex: string | null
  surgery_type: string | null
  pod_risk_label: 'high' | 'medium' | 'low'; pod_risk_score: number
  profile_id?: string | null
  sessions: Session[]
}

const MOCK_CHART_DATA = [
  { label: 'Day 1', v: 52 },
  { label: 'Day 2', v: 55 },
  { label: 'Day 3', v: 51 },
  { label: 'Day 4', v: 58 },
  { label: 'Day 5', v: 62 },
  { label: 'Day 6', v: 60 },
  { label: 'Day 7', v: 65 },
]

const carePlan: Record<string, string> = {
  low: 'Standard monitoring. Re-screen if condition changes.',
  medium: 'Preventive bundle active: reorientation, sleep hygiene, early mobilisation. Re-screen daily.',
  high: 'Flagged to care team. Intensive prevention and daily cognitive sessions.',
}

// Sessions arrive newest-first. Compare recent vs oldest to get direction.
function getTrendDir(sessions: Session[]): 'improving' | 'declining' | 'stable' {
  const scored = sessions.filter(s => s.cognitive_score != null)
  if (scored.length < 2) return 'stable'
  const recent = scored[0].cognitive_score as number
  const oldest = scored[scored.length - 1].cognitive_score as number
  const delta = recent - oldest
  if (delta > 5) return 'improving'
  if (delta < -5) return 'declining'
  return 'stable'
}

// Compare component_scores between this session and the previous one
// to produce plain-English clinical insights.
function generateInsights(
  cs: ComponentScores | undefined,
  pcs: ComponentScores | undefined,
  firstName: string,
): string[] {
  if (!cs || Object.values(cs).every(v => v == null)) return []
  const insights: string[] = []

  if (cs.latency != null && pcs?.latency != null) {
    const delta = cs.latency - pcs.latency
    if (delta < -15)
      insights.push(
        `${firstName} took longer to respond than last session ` +
        `(speed: ${Math.round(cs.latency)}/100 vs ${Math.round(pcs.latency)}/100), ` +
        `suggesting increased cognitive effort.`,
      )
    else if (delta > 15)
      insights.push(
        `${firstName} responded faster than last session ` +
        `(speed: ${Math.round(cs.latency)}/100 vs ${Math.round(pcs.latency)}/100).`,
      )
  }

  if (cs.type_token_ratio != null && pcs?.type_token_ratio != null) {
    const delta = cs.type_token_ratio - pcs.type_token_ratio
    if (delta < -15)
      insights.push(
        `${firstName}'s vocabulary recall was less varied than last session ` +
        `(${Math.round(cs.type_token_ratio)}/100 vs ${Math.round(pcs.type_token_ratio)}/100).`,
      )
    else if (delta > 15)
      insights.push(
        `${firstName} used a wider range of words than last session ` +
        `(${Math.round(cs.type_token_ratio)}/100 vs ${Math.round(pcs.type_token_ratio)}/100).`,
      )
  }

  if (cs.coherence != null && pcs?.coherence != null) {
    const delta = cs.coherence - pcs.coherence
    if (delta < -15)
      insights.push(
        `${firstName}'s responses were less oriented to the topic than last session ` +
        `(${Math.round(cs.coherence)}/100 vs ${Math.round(pcs.coherence)}/100).`,
      )
    else if (delta > 15)
      insights.push(
        `${firstName} showed better topic orientation than last session ` +
        `(${Math.round(cs.coherence)}/100 vs ${Math.round(pcs.coherence)}/100).`,
      )
  }

  return insights
}

export default function PatientDetailView({ patient, trend }: {
  patient: Patient
  trend: { label: string; v: number }[]
}) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  // Seed from the prop; refreshed by the effect below using patient.id.
  const [sessions, setSessions] = useState<Session[]>(patient.sessions ?? [])
  const [pin, setPin] = useState<string | null>(null)

  useEffect(() => {
    if (!patient.profile_id) return
    getPatientPins([patient.profile_id]).then(map => {
      if (patient.profile_id) setPin(map[patient.profile_id] ?? null)
    })
  }, [patient.profile_id])

  // Load selected_domains for this patient from Supabase on mount.
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('patients')
        .select('selected_domains')
        .eq('id', patient.id)
        .single()
      if (data?.selected_domains) setSelectedDomains(data.selected_domains)
    }
    load()
  }, [patient.id])

  // Fetch sessions for the currently viewed patient whenever the patient changes.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const supabase = createClient()
      const { data: { session: auth } } = await supabase.auth.getSession()
      if (!auth) return
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sessions/${patient.id}`,
        { headers: { Authorization: `Bearer ${auth.access_token}` } },
      )
      if (res.ok && !cancelled) setSessions(await res.json())
    }
    load()
    return () => { cancelled = true }
  }, [patient.id])

  const tone = riskTone(patient.pod_risk_label)
  const tv = toneVar(tone)
  const ini = initials(patient.name)
  const firstName = patient.name.split(' ')[0]
  const latestSession = sessions[0]
  const hasEscalation = sessions.some(s => s.flag_escalate)
  const sessionCount = sessions.length
  const lastScore = latestSession?.cognitive_score
  const trendDir = getTrendDir(sessions)

  // Build chart data from sessions (desc order → reverse to oldest-first, take last 7 with scores).
  const sessionChartData = [...sessions]
    .reverse()
    .slice(-7)
    .filter(s => s.cognitive_score != null)
    .map(s => ({ label: s.session_date.slice(5), v: s.cognitive_score as number }))

  // The trend prop comes from a separate API endpoint and may use {date,score} or {label,v} shape.
  // Normalise it so we can use it as a fallback when sessions lack scored data.
  type TrendItem = { date?: string; score?: number; label?: string; v?: number }
  const trendFallback = (trend as TrendItem[])
    .map(t => ({
      label: t.label ?? (t.date ? t.date.slice(5) : ''),
      v: t.v ?? t.score ?? 0,
    }))
    .filter(t => t.label !== '' && t.v > 0)
    .slice(-7)

  const chartData =
    sessionChartData.length > 1 ? sessionChartData
    : trendFallback.length > 1  ? trendFallback
    : MOCK_CHART_DATA

  const isMockData = chartData === MOCK_CHART_DATA

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${patient.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    router.push('/dashboard')
  }

  const toggleDomain = async (key: string) => {
    const next = selectedDomains.includes(key)
      ? selectedDomains.filter(k => k !== key)
      : [...selectedDomains, key]
    setSelectedDomains(next)
    const supabase = createClient()
    await supabase
      .from('patients')
      .update({ selected_domains: next })
      .eq('id', patient.id)
  }

  const details = [
    ['Age', patient.age ? `${patient.age} years` : '—'],
    ['Gender', patient.sex ?? '—'],
    ['Surgical category', patient.surgery_type ?? '—'],
    ['Model confidence', (patient.pod_risk_score ?? 0).toFixed(2)],
  ]

  return (
    <Screen
      topBar={
        <TopBar title={patient.name}
          sub={`Ward 4B${sessionCount > 0 ? ` · Day ${sessionCount}` : ''}`}
          left={<IconButton name="chevLeft" label="Back" onClick={() => router.push('/dashboard')} />}
          right={
            <KebabMenu items={[
              { label: 'Edit patient', icon: 'edit', onClick: () => router.push(`/patients/${patient.id}/edit`) },
              { label: 'Delete patient', icon: 'trash', danger: true, onClick: () => setConfirmDelete(true) },
            ]} />
          } />
      }>

      <ConfirmDialog
        open={confirmDelete}
        title="Remove patient?"
        body={`${patient.name} will be permanently removed from Ward 4B. This action can't be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {hasEscalation && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px',
          background: 'var(--danger-soft)',
          border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
          borderRadius: 'var(--r-md)', marginBottom: 18,
        }}>
          <Icon name="alert" size={22} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 15, color: 'var(--danger)', fontWeight: 600 }}>
            Significant cognitive decline detected. Clinical review recommended.
          </p>
        </div>
      )}

      {/* Identity + risk */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
        <span style={{
          width: 68, height: 68, borderRadius: '50%', flexShrink: 0, display: 'grid',
          placeItems: 'center', background: 'var(--primary)', color: 'var(--on-primary)',
          fontSize: 24, fontWeight: 800,
        }}>{ini}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 23, fontWeight: 800, color: 'var(--text)' }}>{patient.name}</div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>
            {patient.age ? `${patient.age} yrs · ` : ''}{patient.surgery_type ?? 'Unknown procedure'}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 7, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
              background: 'var(--surface-2)', color: 'var(--text-faint)',
              borderRadius: 4, padding: '2px 7px', letterSpacing: '.04em', userSelect: 'all',
            }}>
              ID: {patient.id.slice(0, 8)}
            </span>
            {pin && (
              <span style={{
                fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                background: 'var(--surface-2)', color: 'var(--text-muted)',
                borderRadius: 4, padding: '2px 7px', letterSpacing: '.1em',
              }}>
                PIN: {pin}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Pill tone={tone}>{patient.pod_risk_label === 'medium' ? 'Moderate' : patient.pod_risk_label} risk</Pill>
          <div style={{ fontSize: 13.5, color: 'var(--text-faint)', marginTop: 6, fontWeight: 600 }}>
            {(patient.pod_risk_score ?? 0).toFixed(2)} confidence
          </div>
        </div>
      </Card>

      {/* Care plan */}
      <Card style={{ marginBottom: 18, display: 'flex', gap: 14, alignItems: 'flex-start', borderLeft: `4px solid ${tv}` }}>
        <span style={{ color: tv, flexShrink: 0, marginTop: 2 }}><Icon name="stethoscope" size={26} /></span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 4 }}>Care plan</div>
          <p style={{ margin: 0, fontSize: 15.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {carePlan[patient.pod_risk_label]}
          </p>
        </div>
      </Card>

      {/* Engagement stats */}
      <Card style={{ display: 'flex', marginBottom: 18, textAlign: 'center' }}>
        {[
          ['Sessions', sessionCount],
          ['Cognitive score', lastScore != null ? lastScore : '—'],
          ['Adherence', sessionCount > 2 ? '86%' : '—'],
        ].map(([l, v], i) => (
          <div key={String(l)} style={{ flex: 1, borderLeft: i ? '1px solid var(--line)' : 'none', padding: '16px 8px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{v}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </Card>

      {/* ── 7-day cognitive score chart ──────────────────────────────────── */}
      {chartData.length > 1 && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, letterSpacing: '.08em',
              textTransform: 'uppercase', color: 'var(--text-faint)',
            }}>
              Cognitive Score — Past 7 Days
            </div>
            {isMockData
              ? <Pill tone="neutral">No data yet</Pill>
              : <Pill tone={trendDir === 'improving' ? 'good' : trendDir === 'declining' ? 'danger' : 'neutral'}>
                  {trendDir === 'improving' ? '↑ Improving' : trendDir === 'declining' ? '↓ Declining' : '→ Stable'}
                </Pill>
            }
          </div>
          <LineChart data={chartData} />
        </Card>
      )}

      {/* ── Session focus topic pills ─────────────────────────────────────── */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, letterSpacing: '.08em',
          textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12,
        }}>
          Upcoming Session Focus
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-muted)' }}>
          Select topics to prioritise in the next session.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {CST_DOMAINS.map(({ key, label }) => {
            const active = selectedDomains.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleDomain(key)}
                style={{
                  padding: '9px 18px', borderRadius: 999, fontSize: 14.5, fontWeight: 700,
                  cursor: 'pointer',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--line-strong)'}`,
                  background: active ? 'var(--primary-soft)' : 'var(--surface)',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                  transition: 'all .15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </Card>

      {/* ── Daily session report cards ────────────────────────────────────── */}
      {sessions.length > 0 && (
        <Card pad={0} style={{ marginBottom: 18, overflow: 'hidden' }}>
          <div style={{
            fontSize: 14, fontWeight: 700, letterSpacing: '.08em',
            textTransform: 'uppercase', color: 'var(--text-faint)', padding: '20px 20px 12px',
          }}>
            Session Reports
          </div>

          {sessions.map((session, i) => {
            const rowKey = session.id ?? session.session_date
            const prevSession = sessions[i + 1]
            const isExpanded = expandedId === rowKey
            const cs = session.component_scores
            const pcs = prevSession?.component_scores
            const insights = generateInsights(cs, pcs, firstName)
            const hasFactors = cs && Object.values(cs).some(v => v != null)
            const scoreDelta =
              session.cognitive_score != null && prevSession?.cognitive_score != null
                ? session.cognitive_score - prevSession.cognitive_score
                : null

            return (
              <div key={rowKey} style={{ borderTop: '1px solid var(--line)' }}>

                {/* ── Row header (always visible) */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--surface-2)' : 'transparent',
                    transition: 'background .15s',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)' }}>
                      {new Date(session.session_date).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                    </div>
                    {session.theme && (
                      <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 2, textTransform: 'capitalize' }}>
                        {session.theme.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                      {session.cognitive_score != null ? Math.round(session.cognitive_score) : '—'}
                    </div>
                    {scoreDelta != null && (
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: scoreDelta > 0 ? 'var(--good)' : scoreDelta < 0 ? 'var(--danger)' : 'var(--text-faint)',
                      }}>
                        {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {session.flag_escalate && (
                      <Icon name="alert" size={17} style={{ color: 'var(--danger)' }} />
                    )}
                    <Icon
                      name={isExpanded ? 'chevDown' : 'chevRight'}
                      size={18}
                      style={{ color: 'var(--text-faint)' }}
                    />
                  </div>
                </div>

                {/* ── Expanded body */}
                {isExpanded && (
                  <div style={{ padding: '4px 20px 20px', background: 'var(--surface-2)' }}>

                    {/* Factor breakdown bars */}
                    {hasFactors && (
                      <div style={{ marginBottom: 18 }}>
                        <div style={{
                          fontSize: 12.5, fontWeight: 700, letterSpacing: '.07em',
                          textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12,
                        }}>
                          Factor Breakdown
                        </div>
                        {FACTORS.map(({ key: fk, label }) => {
                          const val = cs![fk]
                          if (val == null) return null
                          const barColor = val >= 70 ? 'var(--good)' : val >= 45 ? 'var(--warn)' : 'var(--danger)'
                          return (
                            <div key={fk} style={{ marginBottom: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{label}</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                                  {Math.round(val)}/100
                                </span>
                              </div>
                              <div style={{ height: 8, borderRadius: 4, background: 'var(--line)', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', width: `${val}%`, borderRadius: 4,
                                  background: barColor, transition: 'width .4s',
                                }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Plain-English clinical insights */}
                    {insights.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{
                          fontSize: 12.5, fontWeight: 700, letterSpacing: '.07em',
                          textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10,
                        }}>
                          Clinical Insights
                        </div>
                        <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {insights.map((line, j) => (
                            <li key={j} style={{ fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* No factor data yet */}
                    {!hasFactors && insights.length === 0 && (
                      <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                        Detailed factor data not yet available for this session.
                      </p>
                    )}

                    {session.duration_seconds != null && (
                      <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 8 }}>
                        Duration: {Math.round(session.duration_seconds / 60)} min
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </Card>
      )}

      {/* Clinical details */}
      <Card pad={6} style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, letterSpacing: '.08em',
          textTransform: 'uppercase', color: 'var(--text-faint)', padding: '16px 18px 8px',
        }}>
          Assessment details
        </div>
        {details.map(([k, v]) => (
          <div key={String(k)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '15px 18px', borderTop: '1px solid var(--line)',
          }}>
            <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text)' }}>{v}</span>
          </div>
        ))}
      </Card>

      {/* Edit / Delete actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        <Button full size="md" icon="edit" onClick={() => router.push(`/patients/${patient.id}/edit`)}>
          Edit patient info
        </Button>
        <Button full size="md" variant="outline" danger icon="trash" onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </div>
    </Screen>
  )
}
