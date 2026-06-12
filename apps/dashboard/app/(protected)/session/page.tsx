import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PatientHomeClient from './PatientHomeClient'

export default async function SessionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Query Supabase directly — no backend round-trip needed
  const { data: patient } = await supabase
    .from('patients')
    .select('id, name')
    .eq('profile_id', user.id)
    .single()

  let todayDone = false
  if (patient) {
    const today = new Date().toISOString().split('T')[0]
    const { data: latest } = await supabase
      .from('sessions')
      .select('session_date, cognitive_score')
      .eq('patient_id', patient.id)
      .order('session_date', { ascending: false })
      .limit(1)
      .single()
    if (latest?.session_date === today && latest.cognitive_score !== null) todayDone = true
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = patient?.name?.split(' ')[0] ?? 'there'

  return <PatientHomeClient patientId={patient?.id ?? ''} firstName={firstName} greeting={greeting} todayDone={todayDone} />
}
