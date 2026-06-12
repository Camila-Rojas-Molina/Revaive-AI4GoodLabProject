'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui'

type Phase = 'idle' | 'starting' | 'active' | 'ending'

// Matches conversation_loop.py thresholds
const SPEECH_THRESHOLD = 0.018  // RMS amplitude (Float32, 0–1)
const SILENCE_MS = 2200          // ms of silence after speech ends a turn

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ActiveSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId') ?? ''

  const [phase, setPhase] = useState<Phase>('idle')
  const [isSpeaking, setIsSpeaking] = useState(false)      // patient speaking → ripple
  const [isBotTalking, setIsBotTalking] = useState(false)   // bot speaking → don't listen
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [secs, setSecs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Stable refs — never trigger re-renders
  const secsRef = useRef(0)   // mirrors secs but always current in async closures
  const isActiveRef = useRef(false)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSpeechRef = useRef(false)
  const vadFrameRef = useRef<number>(0)

  // Store mutually-recursive functions in a ref to avoid stale closures
  const fn = useRef({
    startVAD: async () => {},
    sendAudio: async () => {},
  })

  // Timer — keep secsRef in sync so handleEnd always has the real duration
  useEffect(() => {
    if (phase !== 'active') return
    const t = setInterval(() => setSecs(s => { secsRef.current = s + 1; return s + 1 }), 1000)
    return () => clearInterval(t)
  }, [phase])

  // Cleanup on unmount
  useEffect(() => () => { isActiveRef.current = false; stopAudio() }, [])

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  function stopAudio() {
    cancelAnimationFrame(vadFrameRef.current)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close().catch(() => {})
    streamRef.current = null
    audioCtxRef.current = null
    recorderRef.current = null
    hasSpeechRef.current = false
    chunksRef.current = []
  }

  function playBase64(b64: string): Promise<void> {
    return new Promise(resolve => {
      try {
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
        const audio = new Audio(url)
        audio.onended = () => { URL.revokeObjectURL(url); resolve() }
        audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
        audio.play().catch(() => resolve())
      } catch { resolve() }
    })
  }

  // --- Mutually-recursive VAD loop (updated each render via ref) ---

  fn.current.sendAudio = async () => {
    if (!isActiveRef.current) return
    if (chunksRef.current.length === 0) { await fn.current.startVAD(); return }

    setIsProcessing(true)
    setIsSpeaking(false)

    const blob = new Blob([...chunksRef.current], { type: 'audio/webm' })
    chunksRef.current = []

    try {
      const form = new FormData()
      form.append('patient_id', patientId)
      form.append('audio_file', blob, 'voice.webm')
      form.append('conversation_history', JSON.stringify(historyRef.current))

      const res = await fetch(`${API}/voice`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()

      historyRef.current.push({ role: 'user', content: data.transcript })
      historyRef.current.push({ role: 'assistant', content: data.assistant })

      setCurrentQuestion(data.assistant)
      setIsProcessing(false)
      setIsBotTalking(true)
      if (data.audio) await playBase64(data.audio)
      setIsBotTalking(false)

      // End on stop word or distress
      const stopWords = ['goodbye', 'bye', 'stop', 'exit']
      if (stopWords.some(w => data.transcript.toLowerCase().includes(w)) || data.flag_escalate) {
        handleEnd()
        return
      }

      if (isActiveRef.current) await fn.current.startVAD()
    } catch (e) {
      setIsProcessing(false)
      setError(e instanceof Error ? e.message : 'Something went wrong')
      if (isActiveRef.current) setTimeout(() => fn.current.startVAD(), 2500)
    }
  }

  fn.current.startVAD = async () => {
    if (!isActiveRef.current) return
    stopAudio()
    setIsSpeaking(false)
    hasSpeechRef.current = false
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)

      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = e => e.data.size > 0 && chunksRef.current.push(e.data)
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        ctx.close().catch(() => {})
        fn.current.sendAudio()
      }
      recorder.start(100)

      const buf = new Float32Array(analyser.fftSize)
      const loop = () => {
        if (!isActiveRef.current) return
        analyser.getFloatTimeDomainData(buf)
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length)

        if (rms > SPEECH_THRESHOLD) {
          hasSpeechRef.current = true
          setIsSpeaking(true)
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
        } else if (hasSpeechRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null
            if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
          }, SILENCE_MS)
        }

        vadFrameRef.current = requestAnimationFrame(loop)
      }
      vadFrameRef.current = requestAnimationFrame(loop)
    } catch {
      setError('Could not access microphone. Please allow microphone access and try again.')
    }
  }

  async function startSession() {
    setPhase('starting')
    setError(null)

    try {
      const form = new FormData()
      form.append('patient_id', patientId)
      const res = await fetch(`${API}/voice/start`, { method: 'POST', body: form })
      if (!res.ok) throw new Error('Could not start session')
      const data = await res.json()

      historyRef.current = [{ role: 'assistant', content: data.assistant }]
      setCurrentQuestion(data.assistant)
      isActiveRef.current = true
      setPhase('active')
      setIsBotTalking(true)
      if (data.audio) await playBase64(data.audio)
      setIsBotTalking(false)
      await fn.current.startVAD()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect. Is the API running?')
      setPhase('idle')
    }
  }

  async function handleEnd() {
    if (phase === 'ending') return
    setPhase('ending')
    isActiveRef.current = false
    stopAudio()

    // Save session to backend
    try {
      const form = new FormData()
      form.append('patient_id', patientId)
      form.append('conversation_history', JSON.stringify(historyRef.current))
      form.append('duration_seconds', String(secsRef.current))
      await fetch(`${API}/voice/end`, { method: 'POST', body: form })
    } catch {
      // Non-fatal — still navigate away
    }

    router.push('/session')
  }

  const statusText = isProcessing
    ? 'Just a moment…'
    : isBotTalking
      ? 'Speaking…'
      : isSpeaking
        ? 'Listening… take your time.'
        : 'Listening… take your time.'

  // ── Idle / Starting ───────────────────────────────────────────────────────
  if (phase === 'idle' || phase === 'starting') {
    const starting = phase === 'starting'
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, var(--primary-2) 0%, var(--primary) 100%)',
        color: 'var(--on-primary)', padding: '0 28px', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 10px' }}>
          Ready for today's session?
        </h1>
        <p style={{ fontSize: 15, opacity: .7, margin: '0 0 44px', maxWidth: 260, lineHeight: 1.6 }}>
          Tap the mic to begin. Your AI companion will guide you.
        </p>

        {/* Mic circle button — same style as during recording */}
        <button
          onClick={startSession}
          disabled={starting}
          aria-label="Start session"
          style={{ background: 'none', border: 'none', cursor: starting ? 'default' : 'pointer',
            padding: 0, opacity: starting ? .65 : 1, transition: 'opacity .2s' }}
        >
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,.18)',
            display: 'grid', placeItems: 'center',
          }}>
            <div style={{
              width: 110, height: 110, borderRadius: '50%',
              background: 'rgba(255,255,255,.92)',
              display: 'grid', placeItems: 'center',
            }}>
              <div style={{ color: 'var(--primary)' }}>
                <Icon name="mic" size={46} />
              </div>
            </div>
          </div>
        </button>

        <p style={{ fontSize: 15, opacity: .7, marginTop: 28, fontWeight: 500 }}>
          {starting ? 'Connecting…' : 'Tap to start'}
        </p>

        {error && (
          <div style={{
            fontSize: 14, color: '#fff', background: 'rgba(220,50,50,.35)',
            borderRadius: 12, padding: '12px 18px', marginTop: 20, maxWidth: 300,
          }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  // ── Active / Ending ───────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: .55; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
        .vad-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid rgba(255,255,255,.55);
          animation: ripple 1.8s ease-out infinite;
          pointer-events: none;
        }
        .vad-ring:nth-child(2) { animation-delay: .6s; }
        .vad-ring:nth-child(3) { animation-delay: 1.2s; }
      `}</style>

      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(160deg, var(--primary-2) 0%, var(--primary) 100%)',
        color: 'var(--on-primary)',
      }}>

        {/* Header */}
        <header style={{
          padding: '20px 24px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <button
            onClick={handleEnd}
            aria-label="End session"
            style={{
              width: 48, height: 48, borderRadius: 14, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,.25)', color: 'inherit',
              background: 'rgba(255,255,255,.08)', display: 'grid', placeItems: 'center',
            }}
          >
            <Icon name="x" size={22} />
          </button>

          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontWeight: 700, fontSize: 16, padding: '8px 16px',
            borderRadius: 999, background: 'rgba(255,255,255,.12)',
          }}>
            <Icon name="clock" size={18} />{mm}:{ss}
          </span>
        </header>

        {/* Current question */}
        <div style={{ padding: '4px 24px 0', flexShrink: 0 }}>
          <div style={{
            background: 'rgba(255,255,255,.13)', borderRadius: 20,
            padding: '18px 22px', fontSize: 19, fontWeight: 600,
            lineHeight: 1.45, textAlign: 'center', minHeight: 68,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {currentQuestion ? `"${currentQuestion}"` : '…'}
          </div>
        </div>

        {/* Mic + ripple rings */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 26,
        }}>
          <div style={{ position: 'relative', width: 180, height: 180 }}>
            {isSpeaking && (
              <>
                <div className="vad-ring" />
                <div className="vad-ring" />
                <div className="vad-ring" />
              </>
            )}
            <div style={{
              position: 'relative', zIndex: 1,
              width: 180, height: 180, borderRadius: '50%',
              background: isSpeaking
                ? 'rgba(255,255,255,.28)'
                : 'rgba(255,255,255,.14)',
              display: 'grid', placeItems: 'center',
              transition: 'background .25s',
            }}>
              <div style={{
                width: 120, height: 120, borderRadius: '50%',
                background: isProcessing
                  ? 'rgba(255,255,255,.4)'
                  : 'rgba(255,255,255,.92)',
                display: 'grid', placeItems: 'center',
                transition: 'background .25s',
              }}>
                <div style={{ color: 'var(--primary)' }}>
                  <Icon name="mic" size={46} />
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 15, opacity: .8, margin: 0, fontWeight: 500 }}>
            {statusText}
          </p>

          {error && (
            <div style={{
              fontSize: 13, color: '#fff', background: 'rgba(220,50,50,.35)',
              borderRadius: 10, padding: '10px 16px', maxWidth: 290, textAlign: 'center',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* End Session button */}
        <div style={{ padding: '0 24px 44px', flexShrink: 0 }}>
          <button
            onClick={handleEnd}
            disabled={phase === 'ending'}
            style={{
              width: '100%', height: 58, borderRadius: 999, cursor: 'pointer',
              border: '2px solid rgba(255,100,100,.55)',
              background: 'rgba(255,80,80,.12)',
              color: 'rgba(255,140,140,1)',
              fontWeight: 700, fontSize: 17,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: phase === 'ending' ? .5 : 1,
            }}
          >
            <Icon name="stop" size={18} />
            {phase === 'ending' ? 'Saving session…' : 'End Session'}
          </button>
        </div>
      </div>
    </>
  )
}
