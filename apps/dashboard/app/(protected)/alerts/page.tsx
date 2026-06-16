import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import AlertsClient from './AlertsClient'

export type AlertItem = {
  id: string
  patientId: string
  patientName: string
  icon: string
  title: string
  body: string
  createdAt: string
}

type Session = {
  cognitive_score: number | null
  session_date: string
  created_at: string
  flag_escalate: boolean
}

type Patient = {
  id: string
  name: string
  sessions: Session[]
}

const SCORE_DROP_THRESHOLD = 20

function buildAlerts(patients: Patient[]): AlertItem[] {
  const alerts: AlertItem[] = []

  for (const patient of patients) {
    const sorted = [...(patient.sessions ?? [])]
      .filter(s => s.created_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    for (const s of sorted) {
      if (s.flag_escalate) {
        alerts.push({
          id: `${patient.id}-escalate-${s.created_at}`,
          patientId: patient.id,
          patientName: patient.name,
          icon: 'alert',
          title: `${patient.name} — distress flagged`,
          body: 'Patient expressed distress during this session. Follow-up recommended.',
          createdAt: s.created_at,
        })
      }
    }

    const scored = sorted.filter(s => s.cognitive_score != null && s.cognitive_score > 0)
    for (let i = 0; i < scored.length - 1; i++) {
      const cur = scored[i], prev = scored[i + 1]
      const drop = (prev.cognitive_score as number) - (cur.cognitive_score as number)
      if (drop >= SCORE_DROP_THRESHOLD) {
        alerts.push({
          id: `${patient.id}-drop-${cur.created_at}`,
          patientId: patient.id,
          patientName: patient.name,
          icon: 'alert',
          title: `${patient.name} — score dropped by ${Math.round(drop)} pts`,
          body: `Fell from ${Math.round(prev.cognitive_score as number)} to ${Math.round(cur.cognitive_score as number)}.`,
          createdAt: cur.created_at,
        })
      }
    }
  }

  return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let patients: Patient[] = []
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
    if (res.ok) patients = await res.json()
  } catch { /* API offline */ }

  return <AlertsClient alerts={buildAlerts(patients)} />
}
