'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Icon, Button, Field, TextInput } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)',
      padding: '0 var(--pad)', overflowY: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        maxWidth: 520, width: '100%', margin: '0 auto', padding: '60px 0' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--primary)',
          justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="logo" size={48} />
          <span style={{ fontWeight: 800, fontSize: 40, letterSpacing: '-.02em' }}>Revaive</span>
        </div>
        <p style={{ textAlign: 'center', fontSize: 18, color: 'var(--text-muted)', margin: '0 0 40px' }}>
          Cognitive recovery, together.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, justifyContent: 'center',
          color: 'var(--primary)', background: 'var(--primary-soft)', borderRadius: 'var(--r-md)',
          padding: '14px 20px', marginBottom: 30, fontSize: 16, fontWeight: 600 }}>
          <Icon name="stethoscope" size={22} />
          Clinician sign-in
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Field label="Email" htmlFor="l-email">
            <TextInput id="l-email" type="email" value={email} onChange={setEmail} placeholder="you@hospital.org" />
          </Field>
          <Field label="Password" htmlFor="l-pw">
            <TextInput id="l-pw" type="password" value={password} onChange={setPassword} />
          </Field>

          {error && (
            <div style={{ fontSize: 15, color: 'var(--danger)', background: 'var(--danger-soft)',
              border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 8 }}>
              {error}
            </div>
          )}

          <div style={{ height: 10 }} />
          <Button full size="lg" iconRight="arrowRight" loading={loading}>
            Sign in to ward
          </Button>
        </form>
      </div>
    </div>
  )
}
