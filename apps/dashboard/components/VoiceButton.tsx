'use client'

import { useState, useRef } from 'react'
import { Button } from './ui'

interface VoiceButtonProps {
  patientId: string
  onTranscript?: (transcript: string) => void
  onResponse?: (response: string) => void
  onAudio?: (audioBase64: string) => void
  disabled?: boolean
}

export default function VoiceButton({
  patientId,
  onTranscript,
  onResponse,
  onAudio,
  disabled = false,
}: VoiceButtonProps) {
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        await sendAudioToBackend()
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone'
      setError(message)
      setRecording(false)
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  async function sendAudioToBackend() {
    if (chunksRef.current.length === 0) {
      setError('No audio recorded')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('patient_id', patientId)
      formData.append('audio_file', blob, 'voice.webm')

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/voice`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Call callbacks
      if (onTranscript) onTranscript(data.transcript)
      if (onResponse) onResponse(data.assistant)
      if (onAudio && data.audio) onAudio(data.audio)

      // Auto-play the response audio if available
      if (data.audio) {
        playAudio(data.audio)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process voice'
      setError(message)
      console.error('Voice error:', err)
    } finally {
      setLoading(false)
    }
  }

  function playAudio(audioBase64: string) {
    try {
      const binaryString = atob(audioBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play()
    } catch (err) {
      console.error('Failed to play audio:', err)
    }
  }

  const isDisabled = disabled || loading || recording

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Button
        full
        size="lg"
        iconRight={recording ? 'stop' : 'mic'}
        onClick={recording ? stopRecording : startRecording}
        disabled={isDisabled}
        loading={loading}
      >
        {loading ? 'Processing...' : recording ? 'Stop Speaking' : 'Speak Now'}
      </Button>

      {error && (
        <div
          style={{
            fontSize: 14,
            color: 'var(--danger)',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
            borderRadius: 'var(--r-sm)',
            padding: '12px 16px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
