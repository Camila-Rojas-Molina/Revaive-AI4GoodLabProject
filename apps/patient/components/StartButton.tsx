'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StartButton({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleStart() {
    setLoading(true)
    router.push(`/session/active?patientId=${patientId}`)
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading || !patientId}
      className="w-64 h-64 rounded-full bg-blue-600 text-white text-2xl font-semibold shadow-2xl
        hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all
        flex flex-col items-center justify-center gap-2"
    >
      <span className="text-4xl">🎙</span>
      <span>{loading ? 'Starting…' : 'Start today\'s session'}</span>
    </button>
  )
}
