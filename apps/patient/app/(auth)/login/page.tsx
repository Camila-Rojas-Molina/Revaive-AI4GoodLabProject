'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Icon, Button, Field, TextInput } from '@/components/ui'

type Step = 'form' | 'sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      setStep('sent')
    }
  }

  if (step === 'sent') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 var(--pad)', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>✉️</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600,
          color: 'var(--text)', margin: '0 0 12px' }}>
          Check your email
        </h1>
        <p style={{ fontSize: 19, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5, margin: '0 0 16px' }}>
          We sent a sign-in link to<br />
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{email}</span>
        </p>
        <p style={{ fontSize: 17, color: 'var(--text-faint)', marginBottom: 32 }}>
          Tap the link in that email to continue.
        </p>
        <button onClick={() => setStep('form')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)',
            fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, textDecoration: 'underline' }}>
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '0 var(--pad)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--primary)',
          marginBottom: 10 }}>
          <Icon name="logo" size={44} />
          <span style={{ fontWeight: 800, fontSize: 38, letterSpacing: '-.02em' }}>CogBridge</span>
        </div>
        <p style={{ fontSize: 20, color: 'var(--text-muted)', margin: '0 0 40px' }}>
          Your daily companion
        </p>

        <form onSubmit={handleSubmit}>
          <Field label="Your email address" htmlFor="l-email">
            <TextInput id="l-email" type="email" value={email} onChange={setEmail}
              placeholder="you@example.com" />
          </Field>

          {error && (
            <div style={{ fontSize: 15, color: 'var(--danger)', background: 'var(--danger-soft)',
              border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <Button full size="lg" loading={loading}>
            {loading ? 'Sending…' : 'Send me a link'}
          </Button>
        </form>
      </div>
    </div>
  )
}
