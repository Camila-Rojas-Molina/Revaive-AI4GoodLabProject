import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">CogBridge</span>
        <span className="text-sm text-gray-500">{user.email}</span>
      </header>
      <main>{children}</main>
    </div>
  )
}
