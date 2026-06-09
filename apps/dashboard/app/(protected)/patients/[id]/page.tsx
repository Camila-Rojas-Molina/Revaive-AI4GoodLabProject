import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PatientDetailView from './PatientDetailView'

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const headers = { Authorization: `Bearer ${session.access_token}` }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const [patientRes, trendRes] = await Promise.all([
    fetch(`${apiUrl}/patients/${params.id}`, { headers, cache: 'no-store' }),
    fetch(`${apiUrl}/scores/${params.id}/trend`, { headers, cache: 'no-store' }),
  ])

  if (!patientRes.ok) notFound()

  const patient = await patientRes.json()
  const trend = trendRes.ok ? await trendRes.json() : []

  return <PatientDetailView patient={patient} trend={trend} />
}
