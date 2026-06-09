import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import NurseHome from './NurseHome'

type Patient = {
  id: string
  name: string
  age: number | null
  surgery_type: string | null
  pod_risk_label: 'high' | 'medium' | 'low'
  pod_risk_score: number
  sessions: { cognitive_score: number | null; session_date: string; flag_escalate: boolean; created_at: string }[]
}

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
    // API offline
  }

  return <NurseHome patients={patients} />
}
