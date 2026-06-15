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
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
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
        currentAudioRef.current = audio
        const done = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; resolve() }
        audio.onended = done
        audio.onerror = done
        audio.play().catch(() => done())
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
          setIsSpeaking(false)
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
    setIsSpeaking(false)
    setIsBotTalking(false)
    currentAudioRef.current?.pause()
    currentAudioRef.current = null
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

  const isIdle = phase === 'idle' || phase === 'starting'

  const titleText = isIdle
    ? (phase === 'starting' ? 'Connecting…' : "Ready for today's session?")
    : (isProcessing ? 'Just a moment…' : (currentQuestion || '…'))

  const statusText = isIdle
    ? ''
    : (isBotTalking ? 'Speaking…' : 'Listening…')

  const BG = 'linear-gradient(180deg, #0d3b36 0%, #124d47 100%)'

  return (
    <>
      <style>{`
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: .5; }
          100% { transform: scale(2.6); opacity: 0;  }
        }
        .vad-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid rgba(255,255,255,.45);
          animation: ripple 1.8s ease-out infinite;
          pointer-events: none;
        }
        .vad-ring:nth-child(2) { animation-delay: .6s; }
        .vad-ring:nth-child(3) { animation-delay: 1.2s; }
      `}</style>

      <div style={{
        position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        background: BG, color: 'var(--on-primary)',
      }}>

        {/* Title + mic + status — absolutely centered on the full viewport */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: '50px 36px 0',
          pointerEvents: 'none',
        }}>

          {/* Title area */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              margin: 0,
              fontSize: isIdle ? 38 : 22,
              fontWeight: isIdle ? 800 : 300,
              lineHeight: isIdle ? 1.15 : 1.55,
              letterSpacing: isIdle ? '-.02em' : '.01em',
              maxWidth: isIdle ? 340 : 700,
              fontFamily: isIdle ? 'var(--font-display)' : 'var(--font-ui)',
              opacity: (!isIdle && !currentQuestion && !isProcessing) ? 0.45 : 1,
            }}>
              {titleText}
            </p>
            {phase === 'idle' && (
              <p style={{
                fontSize: 17, color: 'rgba(255,255,255,0.7)', margin: '14px 0 0',
                whiteSpace: 'nowrap', lineHeight: 1.65, fontWeight: 500,
              }}>
                Tap the mic to begin. Revi will guide you.
              </p>
            )}
          </div>

          {/* Mic button + status text */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <button
              onClick={isIdle ? startSession : undefined}
              disabled={phase === 'starting'}
              aria-label={isIdle ? 'Start session' : 'Microphone active'}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: phase === 'idle' ? 'pointer' : 'default',
                opacity: phase === 'starting' ? .65 : 1,
                transition: 'opacity .2s',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ position: 'relative', width: 280, height: 280 }}>
                {isSpeaking && (
                  <>
                    <div className="vad-ring" />
                    <div className="vad-ring" />
                    <div className="vad-ring" />
                  </>
                )}
                <div style={{
                  position: 'relative', zIndex: 1,
                  width: 280, height: 280, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  display: 'grid', placeItems: 'center',
                  transition: 'background .25s',
                }}>
                  <div style={{
                    width: 200, height: 200, borderRadius: '50%',
                    background: isProcessing ? 'rgba(242,238,226,.6)' : '#f2eee2',
                    display: 'grid', placeItems: 'center',
                    transition: 'background .25s',
                  }}>
                    <div style={{ color: 'var(--primary)' }}>
                      <Icon name="mic" size={72} />
                    </div>
                  </div>
                </div>
              </div>
            </button>

            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 500 }}>
              {statusText}
            </p>

            {error && (
              <div style={{
                fontSize: 13, color: '#fff', background: 'rgba(220,50,50,.35)',
                borderRadius: 10, padding: '10px 16px', maxWidth: 280, textAlign: 'center',
              }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Header — renders above the absolute center layer */}
        <header style={{
          padding: '20px 24px', display: 'flex', flexShrink: 0,
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button
            onClick={isIdle ? () => router.push('/session') : handleEnd}
            aria-label={isIdle ? 'Go back' : 'End session'}
            style={{
              width: 44, height: 44, borderRadius: 12, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center',
            }}
          >
            <Icon name="x" size={20} />
          </button>

          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontWeight: 600, fontSize: 15, padding: '7px 14px',
            borderRadius: 999, background: 'rgba(255,255,255,0.15)', color: '#fff',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            <Icon name="clock" size={16} />{mm}:{ss}
          </span>
        </header>

        {/* Spacer — pushes bottom to bottom of flex column */}
        <div style={{ flex: 1 }} />

        {/* Bottom — renders above the absolute center layer */}
        <div style={{ padding: '0 24px 28px', flexShrink: 0 }}>
          {!isIdle ? (
            <button
              onClick={handleEnd}
              disabled={phase === 'ending'}
              style={{
                width: 'fit-content', minWidth: 200, height: 54, borderRadius: 999, cursor: 'pointer',
                border: '1.5px solid rgba(255,100,100,.5)',
                background: 'rgba(255,80,80,.1)',
                color: 'rgba(255,150,150,1)',
                fontWeight: 600, fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                margin: '0 auto',
                opacity: phase === 'ending' ? .5 : 1,
                fontFamily: 'var(--font-ui)',
                padding: '0 28px',
              }}
            >
              <Icon name="stop" size={17} />
              {phase === 'ending' ? 'Saving session…' : 'End Session'}
            </button>
          ) : (
            <div style={{ height: 54 }} />
          )}
        </div>
      </div>
    </>
  )
}
