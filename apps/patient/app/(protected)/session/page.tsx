import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import StartButton from '@/components/StartButton'
import SessionComplete from '@/components/SessionComplete'

export default async function SessionPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const headers = { Authorization: `Bearer ${session.access_token}` }

  let patient: { id: string; name: string } | null = null
  let todaySession: { cognitive_score: number; session_date: string } | null = null

  try {
    const patientRes = await fetch(`${apiUrl}/patients/me`, { headers, cache: 'no-store' })
    if (patientRes.ok) {
      patient = await patientRes.json()

      const latestRes = await fetch(`${apiUrl}/sessions/${patient!.id}/latest`, { headers, cache: 'no-store' })
      if (latestRes.ok) {
        const latest = await latestRes.json()
        const today = new Date().toISOString().split('T')[0]
        if (latest.session_date === today && latest.cognitive_score !== null) {
          todaySession = latest
        }
      }
    }
  } catch {
    // API offline — degrade gracefully
  }

  const firstName = patient?.name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold mb-1">{greeting}, {firstName}</h1>
      <p className="text-lg text-gray-500 mb-12">{dateStr}</p>

      {todaySession ? (
        <SessionComplete
          score={todaySession.cognitive_score}
          name={firstName}
          inline
        />
      ) : (
        <StartButton patientId={patient?.id ?? ''} />
      )}
    </div>
  )
}
