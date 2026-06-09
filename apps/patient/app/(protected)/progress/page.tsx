import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ProgressClient from './ProgressClient'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let trend: { label: string; v: number }[] = []
  let avg = 0

  try {
    const patientRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
    })
    if (patientRes.ok) {
      const patient = await patientRes.json()
      const trendRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scores/${patient.id}/trend`, {
        headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
      })
      if (trendRes.ok) {
        trend = await trendRes.json()
        if (trend.length > 0) avg = Math.round(trend.reduce((s, d) => s + d.v, 0) / trend.length)
      }
    }
  } catch { /* API offline */ }

  return <ProgressClient trend={trend} avg={avg} />
}
