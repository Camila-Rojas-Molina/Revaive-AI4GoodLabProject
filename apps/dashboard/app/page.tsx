import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('[page.tsx] user.id:', user.id, '| profile:', profile, '| error:', profileError)

  if (profile?.role === 'patient') redirect('/session')
  redirect('/dashboard')
}
