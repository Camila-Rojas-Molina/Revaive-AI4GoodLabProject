import Link from 'next/link'
import { Bell, Play, TrendingUp, LogOut } from 'lucide-react'
import PatientBottomNav from '@/components/patient/BottomNav'
import Logo from '@/components/ui/Logo'

export default function PatientHomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-bg border-b-2 border-surface-border flex items-center justify-between px-5 pt-5 pb-[22px]">
        <div className="flex items-center gap-4">
          <Logo className="size-[30px]" />
          <span className="text-[28px] font-bold text-brand-700 leading-none">Revaive</span>
        </div>
        <button className="p-2 rounded-full" aria-label="Notifications">
          <Bell size={20} className="text-surface-primary" strokeWidth={1.8} />
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-5 py-12 flex flex-col gap-12 scrollbar-hide">
        {/* Greeting */}
        <section className="flex flex-col gap-2 text-center">
          <h1 className="text-[48px] font-extrabold text-brand-700 tracking-tighter leading-tight">
            Good morning,<br />John
          </h1>
          <p className="text-xl text-surface-secondary">Ready for your recovery session?</p>
        </section>

        {/* Primary CTA */}
        <Link href="/patient/session" className="block">
          <div className="bg-brand-100 rounded-[48px] p-4 aspect-square w-full">
            <div className="bg-brand-700 rounded-[40px] h-full flex flex-col items-center justify-center gap-3 p-3">
              <div className="size-[124px] rounded-full bg-brand-100/20 flex items-center justify-center">
                <Play size={56} className="text-brand-100 ml-2" fill="currentColor" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[32px] text-white leading-tight text-center">Start Daily Session</span>
                <span className="text-base font-semibold text-white/80 tracking-overline uppercase">
                  15 Minutes Estimated
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Secondary actions */}
        <div className="flex flex-col gap-4">
          <Link
            href="/patient/progress"
            className="flex items-center justify-center gap-4 h-[120px] border-2 border-brand-600 rounded-[48px] w-full"
          >
            <TrendingUp size={28} className="text-brand-600" strokeWidth={1.8} />
            <span className="text-base text-brand-600">View Progress</span>
          </Link>
        </div>

        {/* Sign out */}
        <div className="flex justify-center">
          <button className="flex items-center gap-2 px-8 py-4 rounded-full text-base text-error">
            <LogOut size={18} className="text-error" strokeWidth={1.8} />
            Sign Out
          </button>
        </div>
      </main>

      <PatientBottomNav />
    </div>
  )
}
