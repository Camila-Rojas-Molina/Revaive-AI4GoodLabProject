'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase'
import { Icon, Button, Field, TextInput } from '@/components/ui'

type Role = 'patient' | 'nurse'

export default function LoginPage() {
  const [role, setRole] = useState<Role>('patient')
  const [email, setEmail] = useState('')
  const [patientId, setPatientId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const switchRole = (r: Role) => {
    setRole(r)
    setError(null)
    setPassword('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const actualEmail = role === 'patient'
      ? `${patientId.trim()}@revaive.com`
      : email

    const { error: authError } = await supabase.auth.signInWithPassword({ email: actualEmail, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    if (profile?.role && profile.role !== role) {
      await supabase.auth.signOut()
      setError(
        role === 'patient'
          ? 'This account belongs to a clinician. Please select "I\'m a clinician".'
          : 'This account belongs to a patient. Please select "I\'m a patient".',
      )
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px var(--pad)',
      boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Wordmark */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          color: 'var(--primary)', justifyContent: 'center', marginBottom: 10,
        }}>
          <Icon name="logo" size={44} />
          <span style={{
            fontFamily: "'Geist', 'Geist Sans', system-ui, sans-serif",
            fontWeight: 300,
            fontSize: 38,
            letterSpacing: '0.15em',
            color: 'var(--primary)',
          }}>
            Revaive
          </span>
        </div>

        {/* Tagline */}
        <p style={{
          textAlign: 'center',
          fontSize: 14,
          fontStyle: 'italic',
          color: 'var(--text-faint)',
          fontWeight: 400,
          margin: '0 0 36px',
          letterSpacing: '0.02em',
        }}>
          Cognitive recovery, together.
        </p>

        {/* Role toggle */}
        <div
          role="tablist"
          aria-label="Sign in as"
          style={{
            display: 'flex', gap: 8, padding: 6,
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)', marginBottom: 28,
          }}
        >
          {([['patient', "I'm a patient", 'heart'], ['nurse', "I'm a clinician", 'stethoscope']] as const).map(([id, label, ic]) => {
            const on = role === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={on}
                onClick={() => switchRole(id)}
                style={{
                  flex: 1, minHeight: 56, borderRadius: 13, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 17,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  background: on ? 'var(--surface)' : 'transparent',
                  color: on ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: on ? 'var(--shadow-card)' : 'none',
                  transition: 'all .18s',
                }}
              >
                <Icon name={ic} size={21} />{label}
              </button>
            )
          })}
        </div>

        {/* Form — override --surface to white inside the form so inputs are white */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 4, '--surface': '#ffffff' } as React.CSSProperties}
        >
          {role === 'patient' ? (
            <Field label="Patient ID" htmlFor="l-pid">
              <TextInput
                id="l-pid"
                value={patientId}
                onChange={setPatientId}
                placeholder="Enter your 8-character patient ID"
              />
            </Field>
          ) : (
            <Field label="Email" htmlFor="l-email">
              <TextInput
                id="l-email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="Enter your email"
              />
            </Field>
          )}

          <Field label={role === 'patient' ? 'PIN' : 'Password'} htmlFor="l-pw">
            <TextInput
              id="l-pw"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={role === 'patient' ? 'Enter your 4-digit PIN' : 'Enter your password'}
            />
          </Field>

          {error && (
            <div style={{
              fontSize: 15, color: 'var(--danger)', background: 'var(--danger-soft)',
              border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 8,
            }}>
              {error}
            </div>
          )}

          <div style={{ height: 10 }} />
          <Button full size="lg" iconRight="arrowRight" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
