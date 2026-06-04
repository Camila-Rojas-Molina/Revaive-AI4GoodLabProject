'use client'

import { useEffect, useRef, useState } from 'react'

const PLACEHOLDER_LINES = [
  'Session started. Your companion is ready.',
  'Listening for your voice…',
]

export default function TranscriptFeed() {
  const [lines, setLines] = useState<string[]>(PLACEHOLDER_LINES)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="w-full max-w-md bg-gray-900 rounded-2xl p-5 h-48 overflow-y-auto space-y-2">
      {lines.map((line, i) => (
        <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
