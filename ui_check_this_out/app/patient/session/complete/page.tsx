import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import PatientBottomNav from '@/components/patient/BottomNav'

export default function SessionCompletePage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface-bg">
      <main className="flex-1 flex flex-col items-center justify-center gap-12 px-5 py-12">
        {/* Completion card */}
        <div className="bg-white border-2 border-surface-border rounded-[32px] p-9 flex flex-col items-center gap-12 w-full max-w-sm">
          {/* Icon */}
          <div className="size-48 rounded-full bg-warm-100 flex items-center justify-center">
            <span className="text-7xl">🏅</span>
          </div>

          {/* Message */}
          <div className="flex flex-col items-center gap-6 w-full">
            <h1 className="text-[48px] font-extrabold text-brand-700 tracking-tighter text-center leading-tight">
              Great job today, John!
            </h1>
            <p className="text-xl text-surface-secondary text-center leading-relaxed max-w-xs">
              You completed your 15-minute session.&nbsp; Rest well.
            </p>
          </div>

          {/* Done button */}
          <Link
            href="/patient"
            className="flex items-center justify-center gap-3 bg-brand-700 text-white rounded-full h-16 w-[250px] shadow-lg"
          >
            <span className="text-[22px] font-bold">Done</span>
            <ArrowRight size={16} className="text-white" />
          </Link>
        </div>

        {/* Session summary label */}
        <div className="flex items-center gap-3 opacity-60">
          <span className="text-base font-semibold text-surface-secondary tracking-overline uppercase text-center">
            Session Summary<br />Recorded
          </span>
        </div>
      </main>

      <PatientBottomNav />
    </div>
  )
}
