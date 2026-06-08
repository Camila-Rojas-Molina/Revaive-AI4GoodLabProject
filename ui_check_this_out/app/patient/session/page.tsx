'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mic, Bell, Users, UserPlus, AlertCircle } from 'lucide-react'
import Logo from '@/components/ui/Logo'

export default function PatientSessionPage() {
  const [isListening, setIsListening] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-surface-bg overflow-hidden">
      {/* Header — CogBridge tablet header with avatar */}
      <header className="relative z-10 bg-surface-bg flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <Logo className="size-[30px]" />
          <span className="text-[32px] font-bold text-surface-primary tracking-tight leading-none">CogBridge</span>
        </div>
        <div className="size-12 rounded-full border-2 border-surface-primary bg-brand-100 flex items-center justify-center overflow-hidden">
          <span className="text-sm font-semibold text-brand-800">J</span>
        </div>
      </header>

      {/* Main canvas */}
      <main className="relative flex-1 flex flex-col items-center">
        {/* Ambient pulse blurs */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="w-[234px] h-[600px] rounded-full bg-brand-100 blur-[32px] opacity-20" />
          <div className="w-[156px] h-[400px] rounded-full bg-brand-100 blur-[20px] opacity-10 absolute" />
        </div>

        {/* Greeting */}
        <div className="relative z-10 text-center pt-8 px-6">
          <h1 className="text-[48px] font-extrabold text-surface-primary tracking-tighter leading-tight">
            Good Morning,<br />John
          </h1>
          <p className="mt-2 text-xl text-surface-secondary max-w-xs mx-auto leading-8">
            How are you feeling today? I&apos;m here to listen or help with your recovery exercises.
          </p>
        </div>

        {/* TAP TO TALK button */}
        <div className="relative z-10 flex flex-col items-center gap-8 mt-10">
          <button
            onClick={() => setIsListening(prev => !prev)}
            className={`size-64 rounded-full flex flex-col items-center justify-center gap-4 shadow-2xl transition-all duration-300 ${
              isListening ? 'bg-brand-600 scale-105' : 'bg-brand-700'
            }`}
            aria-label="Tap to talk"
          >
            <Mic size={56} className="text-white" strokeWidth={1.5} />
            <span className="text-2xl font-semibold text-white tracking-overline uppercase">
              {isListening ? 'Listening…' : 'Tap to Talk'}
            </span>
          </button>

          {/* Status pill */}
          <div className="flex items-center gap-2 bg-surface-elevated border border-surface-border rounded-full px-5 py-2.5">
            <span className={`size-3 rounded-full ${isListening ? 'bg-error animate-pulse' : 'bg-success'}`} />
            <span className="text-base text-surface-secondary">
              {isListening ? 'Recording…' : 'Cognitive Assistant Ready'}
            </span>
          </div>
        </div>

        {/* Info cards */}
        <div className="relative z-10 w-full px-6 mt-12 pb-6 grid grid-cols-1 gap-6">
          <div className="bg-white border border-surface-border rounded-xl p-6 flex gap-4 items-start">
            <div className="size-12 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-brand-700 text-lg">💡</span>
            </div>
            <div>
              <p className="text-base text-surface-primary font-medium">Tip of the Hour</p>
              <p className="text-base text-surface-secondary mt-1 leading-6">
                Drinking water helps with mental clarity and post-op recovery.
              </p>
            </div>
          </div>
          <div className="bg-white border border-surface-border rounded-xl p-6 flex gap-4 items-start">
            <div className="size-12 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-brand-700 text-lg">📅</span>
            </div>
            <div>
              <p className="text-base text-surface-primary font-medium">Next Milestone</p>
              <p className="text-base text-surface-secondary mt-1 leading-6">
                Your 10:00 AM walk is in 45 minutes. You&apos;re doing great!
              </p>
            </div>
          </div>
        </div>

        {/* Session complete link */}
        {isListening && (
          <div className="relative z-10 w-full px-6 pb-4">
            <Link
              href="/patient/session/complete"
              className="block w-full bg-brand-700 text-white text-center text-base font-semibold py-4 rounded-xl"
            >
              End Session
            </Link>
          </div>
        )}
      </main>

      {/* Nurse-accessible bottom nav for tablet context */}
      <nav className="sticky bottom-0 z-10 bg-surface-elevated border-t-2 border-surface-border flex items-center justify-around px-9 py-1 h-[48px]">
        <Link href="/nurse" className="flex flex-col items-center gap-0.5">
          <Users size={20} className="text-surface-secondary" strokeWidth={1.8} />
          <span className="text-[12px] font-semibold tracking-caption text-surface-secondary">Patients</span>
        </Link>
        <div className="flex flex-col items-center gap-0.5 bg-brand-700 rounded-xl px-6 py-1">
          <UserPlus size={20} className="text-brand-100" strokeWidth={1.8} />
          <span className="text-[12px] font-semibold tracking-caption text-brand-100">Enroll</span>
        </div>
        <Link href="/nurse/enroll" className="flex flex-col items-center gap-0.5">
          <AlertCircle size={20} className="text-surface-secondary" strokeWidth={1.8} />
          <span className="text-[12px] font-semibold tracking-caption text-surface-secondary">Alerts</span>
        </Link>
      </nav>
    </div>
  )
}
