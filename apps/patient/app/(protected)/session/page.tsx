import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PatientHomeClient from './PatientHomeClient'

export default async function SessionPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const headers = { Authorization: `Bearer ${session.access_token}` }

  let patient: { id: string; name: string } | null = null
  let todayDone = false

  try {
    const patientRes = await fetch(`${apiUrl}/patients/me`, { headers, cache: 'no-store' })
    if (patientRes.ok) {
      patient = await patientRes.json()
      const latestRes = await fetch(`${apiUrl}/sessions/${patient!.id}/latest`, { headers, cache: 'no-store' })
      if (latestRes.ok) {
        const latest = await latestRes.json()
        const today = new Date().toISOString().split('T')[0]
        if (latest.session_date === today && latest.cognitive_score !== null) todayDone = true
      }
    }
  } catch {
    // API offline
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = patient?.name?.split(' ')[0] ?? 'there'

  return <PatientHomeClient patientId={patient?.id ?? ''} firstName={firstName} greeting={greeting} todayDone={todayDone} />
}
