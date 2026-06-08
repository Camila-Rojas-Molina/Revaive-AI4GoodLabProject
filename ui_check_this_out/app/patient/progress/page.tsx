import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'
import PatientBottomNav from '@/components/patient/BottomNav'

const weekData = [
  { day: 'Mon', score: 60 },
  { day: 'Tue', score: 65 },
  { day: 'Wed', score: 68 },
  { day: 'Thu', score: 72 },
  { day: 'Fri', score: 70 },
  { day: 'Sat', score: 75 },
  { day: 'Sun', score: 78 },
]

const focusAreas = [
  { label: 'Speech Fluency', value: 72, color: '#306669' },
  { label: 'Memory Recall', value: 58, color: '#2aa84c' },
  { label: 'Attention', value: 84, color: '#306669' },
  { label: 'Processing Speed', value: 63, color: '#ffa000' },
]

function BarChart({ data }: { data: { day: string; score: number }[] }) {
  const max = 100
  return (
    <div className="flex items-end justify-between gap-2 h-32 px-1">
      {data.map(({ day, score }) => {
        const pct = (score / max) * 100
        const isToday = day === 'Sun'
        return (
          <div key={day} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[10px] font-semibold text-surface-tertiary">{score}</span>
            <div className="w-full rounded-t-sm" style={{ height: `${pct}%`, backgroundColor: isToday ? '#003739' : '#adc9c2' }} />
            <span className="text-[11px] font-semibold text-surface-tertiary">{day}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function ProgressPage() {
  const currentScore = 78
  const prevScore = 65
  const delta = currentScore - prevScore

  return (
    <div className="flex flex-col min-h-screen bg-surface-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-bg border-b-2 border-surface-border flex items-center gap-3 px-5 pt-5 pb-[22px]">
        <Link href="/patient" className="p-2 -ml-2" aria-label="Back">
          <ChevronLeft size={22} className="text-surface-primary" />
        </Link>
        <h1 className="text-xl font-bold text-surface-primary">My Progress</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-8 flex flex-col gap-8 scrollbar-hide">
        {/* Score ring + headline */}
        <section className="flex flex-col items-center gap-4">
          <ScoreRing value={currentScore} />
          <div className="flex flex-col items-center gap-1">
            <p className="text-base font-semibold text-surface-primary">Cognitive Score</p>
            <p className="text-sm text-success font-semibold">
              +{delta} pts this week
            </p>
          </div>
        </section>

        {/* Weekly bar chart */}
        <section className="bg-white border border-surface-border rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-surface-primary">7-Day History</h2>
            <span className="text-xs font-semibold text-surface-tertiary tracking-overline uppercase">This Week</span>
          </div>
          <BarChart data={weekData} />
        </section>

        {/* Streak */}
        <section className="bg-brand-700 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-white">Current Streak</span>
            <span className="text-sm text-brand-100/80">Keep it up!</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[48px] font-extrabold text-white leading-none">7</span>
            <span className="text-xl text-brand-100/80">days</span>
          </div>
        </section>

        {/* Focus areas */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-surface-primary">Focus Areas</h2>
          <div className="flex flex-col gap-3">
            {focusAreas.map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-surface-border rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-surface-secondary">{label}</span>
                  <span className="text-sm font-bold text-surface-primary">{value}%</span>
                </div>
                <div className="h-2 bg-surface-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${value}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PatientBottomNav />
    </div>
  )
}
