'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import TranscriptFeed from '@/components/TranscriptFeed'
import SessionComplete from '@/components/SessionComplete'

type Status = 'active' | 'complete'

export default function ActiveSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId') ?? ''

  const [status, setStatus] = useState<Status>('active')
  const [completedSession, setCompletedSession] = useState<{ cognitive_score: number } | null>(null)
  const [patientName, setPatientName] = useState('there')

  // Poll every 5 s for a completed session today
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
        setCompletedSession(data)
        setStatus('complete')
      }
    } catch {
      // ignore
    }
  }, [patientId])

  useEffect(() => {
    const id = setInterval(checkForCompletion, 5000)
    return () => clearInterval(id)
  }, [checkForCompletion])

  if (status === 'complete' && completedSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <SessionComplete score={completedSession.cognitive_score} name={patientName} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-blue-400 opacity-30" />
            <span className="relative inline-flex h-12 w-12 rounded-full bg-blue-500 items-center justify-center text-2xl">
              🎙
            </span>
          </div>
          <p className="text-xl font-medium">Session in progress…</p>
          <p className="text-gray-400 text-base">Your companion is listening</p>
        </div>

        <TranscriptFeed />
      </div>

      <div className="p-8">
        <button
          onClick={() => router.push('/session')}
          className="w-full border-2 border-gray-700 text-gray-300 py-4 rounded-xl text-lg font-medium hover:bg-gray-800 transition-colors"
        >
          End session
        </button>
      </div>
    </div>
  )
}
