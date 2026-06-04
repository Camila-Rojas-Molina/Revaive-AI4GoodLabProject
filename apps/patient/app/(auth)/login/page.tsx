'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-6">✉️</div>
        <h1 className="text-2xl font-semibold mb-3">Check your email</h1>
        <p className="text-lg text-gray-600 max-w-xs leading-relaxed">
          We sent a sign-in link to<br />
          <span className="font-medium text-gray-900">{email}</span>
        </p>
        <p className="mt-4 text-base text-gray-500">Tap the link in that email to continue.</p>
        <button
          onClick={() => setStep('form')}
          className="mt-8 text-sm text-blue-600 underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold mb-2">CogBridge</h1>
        <p className="text-lg text-gray-500 mb-10">Your daily companion</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-lg font-medium text-gray-800 mb-2">
              Your email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && (
            <p className="text-base text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending…' : 'Send me a link'}
          </button>
        </form>
      </div>
    </div>
  )
}
