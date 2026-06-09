'use client'

import { useRouter } from 'next/navigation'
import {
  Screen, TopBar, IconButton, Card, Pill, LineChart, Icon,
  initials, riskTone, toneVar,
} from '@/components/ui'

type Patient = {
  id: string; name: string; age: number | null; sex: string | null
  surgery_type: string | null; anesthesia_duration_min: number | null
  comorbidity_count: number; baseline_orientation_score: number | null
  pod_risk_label: 'high' | 'medium' | 'low'; pod_risk_score: number
  sessions: { cognitive_score: number | null; session_date: string; flag_escalate: boolean; transcript?: string }[]
}

const carePlan: Record<string, string> = {
  low: 'Standard monitoring. Re-screen if condition changes.',
  medium: 'Preventive bundle active: reorientation, sleep hygiene, early mobilisation. Re-screen daily.',
  high: 'Flagged to care team. Intensive prevention and daily cognitive sessions.',
}

export default function PatientDetailView({ patient, trend }: {
  patient: Patient
  trend: { label: string; v: number }[]
}) {
  const router = useRouter()
  const tone = riskTone(patient.pod_risk_label)
  const tv = toneVar(tone)
  const ini = initials(patient.name)
  const latestSession = patient.sessions?.[0]
  const hasEscalation = patient.sessions?.some(s => s.flag_escalate)

  const details = [
    ['Age', patient.age ? `${patient.age} years` : '—'],
    ['Sex', patient.sex ?? '—'],
    ['Surgery', patient.surgery_type ?? '—'],
    ['Anesthesia', patient.anesthesia_duration_min ? `${patient.anesthesia_duration_min} min` : '—'],
    ['Comorbidities', patient.comorbidity_count ?? 0],
    ['Baseline orientation', patient.baseline_orientation_score != null ? `${patient.baseline_orientation_score}/10` : '—'],
  ]

  const sessionCount = patient.sessions?.length ?? 0
  const lastScore = latestSession?.cognitive_score

  return (
    <Screen
      topBar={
        <TopBar title={patient.name}
          sub={`Ward 4B${sessionCount > 0 ? ` · Day ${sessionCount}` : ''}`}
          left={<IconButton name="chevLeft" label="Back" onClick={() => router.push('/dashboard')} />} />
      }>

      {hasEscalation && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px',
          background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
          borderRadius: 'var(--r-md)', marginBottom: 18 }}>
          <Icon name="alert" size={22} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 15, color: 'var(--danger)', fontWeight: 600 }}>
            Significant cognitive decline detected. Clinical review recommended.
          </p>
        </div>
      )}

      {/* Identity + risk */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
        <span style={{ width: 68, height: 68, borderRadius: '50%', flexShrink: 0, display: 'grid',
          placeItems: 'center', background: 'var(--primary)', color: 'var(--on-primary)',
          fontSize: 24, fontWeight: 800 }}>{ini}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 23, fontWeight: 800, color: 'var(--text)' }}>{patient.name}</div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>
            {patient.age ? `${patient.age} yrs · ` : ''}{patient.surgery_type ?? 'Unknown procedure'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Pill tone={tone}>{patient.pod_risk_label} risk</Pill>
          <div style={{ fontSize: 13.5, color: 'var(--text-faint)', marginTop: 6, fontWeight: 600 }}>
            score {((patient.pod_risk_score ?? 0) * 10).toFixed(1)}/10
          </div>
        </div>
      </Card>

      {/* Care plan */}
      <Card style={{ marginBottom: 18, display: 'flex', gap: 14, alignItems: 'flex-start',
        borderLeft: `4px solid ${tv}` }}>
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
          ['Last score', lastScore != null ? lastScore : '—'],
          ['Adherence', sessionCount > 2 ? '86%' : '—'],
        ].map(([l, v], i) => (
          <div key={String(l)} style={{ flex: 1, borderLeft: i ? '1px solid var(--line)' : 'none', padding: '16px 8px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{v}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </Card>

      {/* Score trend */}
      {trend.length > 0 && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            color: 'var(--text-faint)', marginBottom: 14 }}>Cognitive Score Trend</div>
          <LineChart data={trend} />
        </Card>
      )}

      {/* Clinical details */}
      <Card pad={6} style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
          color: 'var(--text-faint)', padding: '16px 18px 8px' }}>Assessment details</div>
        {details.map(([k, v], i) => (
          <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '15px 18px', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text)' }}>{v}</span>
          </div>
        ))}
      </Card>

      {/* Latest transcript */}
      {latestSession?.transcript && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            color: 'var(--text-faint)', marginBottom: 14 }}>Latest Session</div>
          <div style={{ fontSize: 14.5, color: 'var(--text-muted)', marginBottom: 10 }}>
            {latestSession.session_date} · Score: {latestSession.cognitive_score ?? '—'}/100
          </div>
          <pre style={{ margin: 0, fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap',
            background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '14px 16px', lineHeight: 1.6 }}>
            {latestSession.transcript}
          </pre>
        </Card>
      )}
    </Screen>
  )
}
