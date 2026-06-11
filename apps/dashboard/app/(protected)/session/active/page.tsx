'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui'
import VoiceButton from '@/components/VoiceButton'

type Turn = { role: 'patient' | 'assistant'; text: string }

export default function ActiveSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId') ?? ''

  const [secs, setSecs] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])

  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  const handleTranscript = (text: string) =>
    setTurns(prev => [...prev, { role: 'patient', text }])

  const handleResponse = (text: string) =>
    setTurns(prev => [...prev, { role: 'assistant', text }])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(170deg,var(--primary-2),var(--primary))', color: 'var(--on-primary)',
      minHeight: '100dvh' }}>

      {/* Header */}
      <header style={{ padding: '22px var(--pad)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.push('/session')} aria-label="End session"
          style={{ width: 48, height: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,.25)',
            background: 'rgba(255,255,255,.08)', color: 'inherit', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icon name="x" size={24} />
        </button>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 17,
          padding: '8px 16px', borderRadius: 999, background: 'rgba(255,255,255,.12)' }}>
          <Icon name="clock" size={20} />{mm}:{ss}
        </span>
      </header>

      {/* Conversation transcript */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 var(--pad)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {turns.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center', padding: '40px 0' }}>
            <span style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,.14)',
              display: 'grid', placeItems: 'center', marginBottom: 24 }}>
              <Icon name="mic" size={46} />
            </span>
            <p style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px', opacity: .9 }}>
              Ready when you are
            </p>
            <p style={{ fontSize: 16, opacity: .65, margin: 0 }}>
              Tap the button below and start speaking
            </p>
          </div>
        ) : (
          turns.map((t, i) => (
            <div key={i} style={{
              alignSelf: t.role === 'patient' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              background: t.role === 'patient' ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.08)',
              borderRadius: t.role === 'patient' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '12px 16px',
              fontSize: 16,
              lineHeight: 1.5,
            }}>
              {t.text}
            </div>
          ))
        )}
      </div>

      {/* Voice button */}
      <div style={{ padding: '20px var(--pad) 40px' }}>
        <VoiceButton
          patientId={patientId}
          onTranscript={handleTranscript}
          onResponse={handleResponse}
        />
      </div>
    </div>
  )
}
