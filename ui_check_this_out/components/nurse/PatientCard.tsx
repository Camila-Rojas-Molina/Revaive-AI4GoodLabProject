import Link from 'next/link'
import { Flag, ChevronRight } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import { TrendBadge, RiskBadge } from '@/components/ui/Badge'
import type { Patient } from '@/lib/types'

function scoreColor(score: number): string {
  if (score >= 75) return '#2aa84c'
  if (score >= 50) return '#002021'
  return '#d32f2f'
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) return '--'
  const d = Math.round(((current - previous) / previous) * 100)
  return d > 0 ? `+${d}%` : `${d}%`
}

export default function PatientCard({ patient }: { patient: Patient }) {
  const color = scoreColor(patient.score)
  const change = pctChange(patient.score, patient.previousScore)
  const isAlert = patient.trend === 'Declining'

  return (
    <Link href={`/nurse/patients/${patient.id}`} className="block">
      <div className="bg-white border border-surface-border rounded-xl p-6 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-[#efeded] flex items-center justify-center shrink-0">
              <span className="text-base font-bold text-brand-800">{patient.initials}</span>
            </div>
            <div>
              <p className="text-base text-surface-primary leading-6">{patient.name}</p>
              <p className="text-xs font-semibold tracking-caption text-surface-tertiary leading-4">
                Room {patient.room} • ID: #{patient.id}
              </p>
            </div>
          </div>
          {isAlert
            ? <Flag size={16} className="text-error shrink-0" />
            : <ChevronRight size={16} className="text-surface-tertiary shrink-0" />
          }
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2">
          <TrendBadge trend={patient.trend} />
          <RiskBadge risk={patient.risk} />
        </div>

        {/* Score row */}
        <div className="border-t border-surface-border pt-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-caption text-surface-tertiary">Cognitive Score</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-semibold leading-10 tracking-tight" style={{ color }}>
                {patient.score}
              </span>
              <span className="text-xs font-semibold text-surface-tertiary tracking-caption">/100</span>
            </div>
          </div>
          <div className="relative size-16">
            <ProgressRing value={patient.score} size={64} strokeWidth={5} color={color} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold leading-none" style={{ color }}>
                {change}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
