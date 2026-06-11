import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import EditPatientPage from './EditPatientPage'

export default async function EditPatientServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${id}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })

  if (!res.ok) notFound()

  const patient = await res.json()
  return <EditPatientPage patient={patient} />
}
