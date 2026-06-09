'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Icon } from '@/components/ui'

const SESSION_STEPS = [
  { q: "Can you tell me today's date?", tag: 'Orientation' },
  { q: 'Please name three animals you might see at a farm.', tag: 'Word recall' },
  { q: 'Count backward from 20 by twos.', tag: 'Attention' },
  { q: 'Describe what you had for breakfast today.', tag: 'Memory' },
]

export default function ActiveSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId') ?? ''

  const [step, setStep] = useState(0)
  const [secs, setSecs] = useState(0)
  const [listening, setListening] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!listening) return
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [listening])

  const checkForCompletion = useCallback(async () => {
    if (!patientId) return
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sessions/${patientId}/latest`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (!res.ok) return
      const data = await res.json()
      const today = new Date().toISOString().split('T')[0]
      if (data.session_date === today && data.cognitive_score !== null) {
        setDone(true)
        router.push('/session')
      }
    } catch { /* ignore */ }
  }, [patientId, router])

  useEffect(() => {
    const id = setInterval(checkForCompletion, 5000)
    return () => clearInterval(id)
  }, [checkForCompletion])

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const cur = SESSION_STEPS[step]
  const next = () => step < SESSION_STEPS.length - 1 ? setStep(step + 1) : router.push('/session')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(170deg,var(--primary-2),var(--primary))', color: 'var(--on-primary)' }}>

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

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '4px 0 8px' }}>
        {SESSION_STEPS.map((_, i) => (
          <span key={i} style={{ height: 6, width: i === step ? 34 : 22, borderRadius: 3,
            background: i <= step ? 'var(--on-primary)' : 'rgba(255,255,255,.28)', transition: 'all .3s' }} />
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '20px 40px', textAlign: 'center' }}>
        <span style={{ fontSize: 14, letterSpacing: '.16em', fontWeight: 700, opacity: .75, marginBottom: 22 }}>
          {cur.tag.toUpperCase()} · {step + 1} OF {SESSION_STEPS.length}
        </span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 38, lineHeight: 1.18,
          margin: '0 0 54px', maxWidth: 560 }}>{cur.q}</h2>

        <div style={{ position: 'relative', display: 'grid', placeItems: 'center', marginBottom: 30 }}>
          {listening && [0, 1, 2].map(i => (
            <span key={i} style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,.3)',
              animation: `cbWave 2.4s ease-out ${i * 0.8}s infinite` }} />
          ))}
          <span style={{ width: 138, height: 138, borderRadius: '50%', background: 'rgba(255,255,255,.14)',
            display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--on-primary)',
              color: 'var(--primary)', display: 'grid', placeItems: 'center',
              animation: listening ? 'cbBreath 2.4s ease-in-out infinite' : 'none' }}>
              <Icon name={listening ? 'mic' : 'waveform'} size={46} />
            </span>
          </span>
        </div>
        <p style={{ fontSize: 18, opacity: .85, margin: 0, minHeight: 26 }}>
          {listening ? 'Listening… take your time.' : 'Paused'}
        </p>
      </div>

      <div style={{ padding: '0 var(--pad) 40px', display: 'flex', gap: 14 }}>
        <button onClick={() => setListening(l => !l)} aria-label={listening ? 'Pause' : 'Resume'}
          style={{ width: 'var(--tap)', height: 'var(--tap)', borderRadius: 16, flexShrink: 0,
            border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: 'inherit',
            display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icon name={listening ? 'pause' : 'play'} size={26} />
        </button>
        <button onClick={next}
          style={{ flex: 1, minHeight: 'var(--tap)', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'var(--on-primary)', color: 'var(--primary)', fontWeight: 800, fontSize: 19,
            fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {step < SESSION_STEPS.length - 1 ? 'Next question' : 'Finish session'}
          <Icon name="arrowRight" size={23} />
        </button>
      </div>
    </div>
  )
}
