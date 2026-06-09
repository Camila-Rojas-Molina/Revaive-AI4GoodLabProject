import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: { session } } = await supabase.auth.getSession()
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/me`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
      cache: 'no-store',
    })
    if (res.ok) redirect('/session')
  } catch {
    // API offline — fall through to nurse dashboard
  }

  redirect('/dashboard')
}
