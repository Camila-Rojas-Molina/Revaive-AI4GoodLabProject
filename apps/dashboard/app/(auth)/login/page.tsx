'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Icon, Button, Field, TextInput } from '@/components/ui'

type Role = 'patient' | 'nurse'
type Step = 'form' | 'sent'

export default function LoginPage() {
  const [role, setRole] = useState<Role>('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    if (profile?.role && profile.role !== role) {
      await supabase.auth.signOut()
      setError(role === 'patient' ? 'This account belongs to a clinician. Please select "I\'m a clinician".' : 'This account belongs to a patient. Please select "I\'m a patient".')
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  async function handleSendCode() {
    if (!email) { setError('Please enter your email first.'); return }
    setCodeLoading(true)
    setError(null)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setCodeLoading(false)
    if (authError) { setError(authError.message); return }
    setStep('sent')
  }

  if (step === 'sent') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 var(--pad)', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>✉️</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600,
          color: 'var(--text)', margin: '0 0 12px' }}>Check your email</h1>
        <p style={{ fontSize: 19, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5, margin: '0 0 16px' }}>
          We sent a sign-in link to<br />
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{email}</span>
        </p>
        <p style={{ fontSize: 17, color: 'var(--text-faint)', marginBottom: 32 }}>Tap the link in that email to continue.</p>
        <button onClick={() => setStep('form')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)',
            fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, textDecoration: 'underline' }}>
          Use a different email
        </button>
      </div>
    )
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

        {/* Role selector */}
        <div role="tablist" aria-label="Sign in as"
          style={{ display: 'flex', gap: 8, padding: 6, background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)', marginBottom: 30 }}>
          {([['patient', "I'm a patient", 'heart'], ['nurse', "I'm a clinician", 'stethoscope']] as const).map(([id, label, ic]) => {
            const on = role === id
            return (
              <button key={id} role="tab" aria-selected={on} onClick={() => { setRole(id); setError(null) }}
                style={{ flex: 1, minHeight: 56, borderRadius: 13, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 17,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  background: on ? 'var(--surface)' : 'transparent',
                  color: on ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: on ? 'var(--shadow-card)' : 'none', transition: 'all .18s' }}>
                <Icon name={ic} size={21} />{label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Field label="Email" htmlFor="l-email">
            <TextInput id="l-email" type="email" value={email} onChange={setEmail}
              placeholder="Enter your email" />
          </Field>

          <Field label="Password" htmlFor="l-pw">
            <TextInput id="l-pw" type="password" value={password} onChange={setPassword}
              placeholder="Enter your password" />
          </Field>

          <button type="button" onClick={handleSendCode} disabled={codeLoading}
            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
              padding: '6px 0', opacity: codeLoading ? 0.6 : 1 }}>
            {codeLoading ? 'Sending…' : 'Send me a code'}
          </button>

          {error && (
            <div style={{ fontSize: 15, color: 'var(--danger)', background: 'var(--danger-soft)',
              border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 8 }}>
              {error}
            </div>
          )}

          <div style={{ height: 10 }} />
          <Button full size="lg" iconRight="arrowRight" loading={loading}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
