import { notFound } from 'next/navigation'
import { ChevronLeft, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import Link from 'next/link'
import { patients } from '@/lib/data'
import LineChart from '@/components/ui/LineChart'
import { RiskLevelBadge } from '@/components/ui/Badge'
import NurseBottomNav from '@/components/nurse/BottomNav'

function SignalRow({ label, value, direction }: { label: string; value: string; direction: 'up' | 'down' | 'neutral' }) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const color = direction === 'up' ? 'text-success' : direction === 'down' ? 'text-error' : 'text-surface-tertiary'
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
      <span className="text-base text-surface-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-surface-primary">{value}</span>
        <Icon size={16} className={color} strokeWidth={1.8} />
      </div>
    </div>
  )
}

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = patients.find(p => p.id === id)
  if (!patient) notFound()

  const isImproving = patient.trend === 'Improving'
  const isDeclining = patient.trend === 'Declining'

  return (
    <div className="flex flex-col min-h-screen bg-surface-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-bg border-b-2 border-surface-border flex items-center gap-3 px-5 pt-5 pb-[22px]">
        <Link href="/nurse" className="p-2 -ml-2" aria-label="Back">
          <ChevronLeft size={22} className="text-surface-primary" />
        </Link>
        <h1 className="text-xl font-bold text-surface-primary">Patient Profile</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 scrollbar-hide">
        {/* Patient identity card */}
        <div className="bg-white border border-surface-border rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-[#efeded] flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-brand-800">{patient.initials}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[24px] font-bold text-surface-primary leading-tight">{patient.name}</h2>
              <p className="text-sm text-surface-tertiary font-semibold">
                Room {patient.room} &nbsp;·&nbsp; Age {patient.age} &nbsp;·&nbsp; Day {patient.dayOfRecovery} Post-Op
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RiskLevelBadge risk={patient.risk} />
            <span className="text-xs font-semibold tracking-caption text-surface-tertiary uppercase bg-surface-elevated px-3 py-1 rounded-full">
              {patient.surgeryType}
            </span>
          </div>
        </div>

        {/* Score + trend */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-surface-border rounded-2xl p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-caption text-surface-tertiary uppercase">Cognitive Score</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-[40px] font-bold leading-none ${isDeclining ? 'text-error' : isImproving ? 'text-success' : 'text-surface-primary'}`}>
                {patient.score}
              </span>
              <span className="text-sm text-surface-tertiary">/100</span>
            </div>
          </div>
          <div className="bg-white border border-surface-border rounded-2xl p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-caption text-surface-tertiary uppercase">7-Day Trend</span>
            <div className="flex items-center gap-2">
              {isDeclining ? (
                <TrendingDown size={28} className="text-error" />
              ) : isImproving ? (
                <TrendingUp size={28} className="text-success" />
              ) : (
                <Minus size={28} className="text-surface-tertiary" />
              )}
              <span className={`text-xl font-bold ${isDeclining ? 'text-error' : isImproving ? 'text-success' : 'text-surface-secondary'}`}>
                {patient.trend}
              </span>
            </div>
          </div>
        </div>

        {/* Line chart */}
        <div className="bg-white border border-surface-border rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-surface-primary">Score History</h3>
            <span className="text-xs font-semibold tracking-overline uppercase text-surface-tertiary">7 Days</span>
          </div>
          <div className="h-40">
            <LineChart
              data={patient.chartData}
              color={isDeclining ? '#d32f2f' : '#003739'}
              declining={isDeclining}
            />
          </div>
        </div>

        {/* Clinical report */}
        <div className="bg-white border border-surface-border rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-base font-semibold text-surface-primary">Daily Clinical Report</h3>
          <div className="bg-surface-bg rounded-xl p-4">
            <p className="text-base text-surface-secondary leading-7">{patient.recommendation}</p>
          </div>
          {patient.observation && (
            <div className="bg-warning-light rounded-xl p-4 flex gap-3 items-start">
              <span className="text-warning text-lg">⚠️</span>
              <p className="text-sm text-surface-secondary leading-6">{patient.observation}</p>
            </div>
          )}
        </div>

        {/* Key signals */}
        <div className="bg-white border border-surface-border rounded-2xl p-5 flex flex-col gap-2">
          <h3 className="text-base font-semibold text-surface-primary mb-2">Key Signals</h3>
          {patient.signals.map(signal => (
            <SignalRow
              key={signal.label}
              label={signal.label}
              value={signal.value}
              direction={signal.direction}
            />
          ))}
        </div>
      </main>

      <NurseBottomNav />
    </div>
  )
}
