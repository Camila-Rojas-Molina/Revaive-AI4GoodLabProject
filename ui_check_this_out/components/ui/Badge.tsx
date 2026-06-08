import type { TrendStatus, RiskLevel } from '@/lib/types'

interface TrendBadgeProps {
  trend: TrendStatus
}

export function TrendBadge({ trend }: TrendBadgeProps) {
  const styles: Record<TrendStatus, string> = {
    Declining: 'bg-error-light text-error-dark',
    Stable:    'bg-[#7af1fc] text-[#006e75]',
    Improving: 'bg-[#83fc94] text-[#002107]',
  }
  return (
    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold tracking-caption ${styles[trend]}`}>
      {trend}
    </span>
  )
}

interface RiskBadgeProps {
  risk: RiskLevel
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  return (
    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold tracking-caption bg-[#efeded] text-surface-tertiary">
      Risk: {risk}
    </span>
  )
}

interface RiskLevelBadgeProps {
  risk: 'High' | 'Med' | 'Low'
}

export function RiskLevelBadge({ risk }: RiskLevelBadgeProps) {
  const styles: Record<string, string> = {
    High: 'bg-error-light border border-error/20 text-error',
    Med:  'bg-warning-light border border-warning/20 text-warning',
    Low:  'bg-success-light border border-success/20 text-success',
  }
  const label = risk === 'Med' ? 'Moderate' : risk
  return (
    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${styles[risk]}`}>
      {label} Risk
    </span>
  )
}
