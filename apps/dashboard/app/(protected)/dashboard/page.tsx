import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PatientCard from '@/components/PatientCard'

type Patient = {
  id: string
  name: string
  pod_risk_label: 'high' | 'medium' | 'low'
  pod_risk_score: number
  sessions: { cognitive_score: number | null; session_date: string; flag_escalate: boolean }[]
}

const RISK_ORDER = { high: 1, medium: 2, low: 3 } as const

export default async function DashboardPage() {
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
  } catch {
    // API offline — show empty list
  }

  const sorted = [...patients].sort((a, b) => {
    const aFlag = a.sessions?.some(s => s.flag_escalate) ? 0 : 1
    const bFlag = b.sessions?.some(s => s.flag_escalate) ? 0 : 1
    if (aFlag !== bFlag) return aFlag - bFlag
    return (RISK_ORDER[a.pod_risk_label] ?? 4) - (RISK_ORDER[b.pod_risk_label] ?? 4)
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Patients</h1>
        <span className="text-sm text-gray-500">{sorted.length} assigned</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm">No patients assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(patient => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      )}
    </div>
  )
}
