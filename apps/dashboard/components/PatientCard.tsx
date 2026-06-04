import Link from 'next/link'
import RiskBadge from './RiskBadge'

type Session = { cognitive_score: number | null; session_date: string; flag_escalate: boolean }

interface Props {
  patient: {
    id: string
    name: string
    pod_risk_label: 'high' | 'medium' | 'low'
    sessions?: Session[]
  }
}

function trendArrow(sessions: Session[]): { symbol: string; color: string } {
  const withScore = sessions.filter(s => s.cognitive_score !== null)
  if (withScore.length < 2) return { symbol: '—', color: 'text-gray-400' }
  const delta = withScore[0].cognitive_score! - withScore[1].cognitive_score!
  if (delta > 5) return { symbol: '▲', color: 'text-green-600' }
  if (delta < -5) return { symbol: '▼', color: 'text-red-600' }
  return { symbol: '—', color: 'text-gray-400' }
}

export default function PatientCard({ patient }: Props) {
  const sessions = patient.sessions ?? []
  const latest = sessions[0]
  const hasFlag = sessions.some(s => s.flag_escalate)
  const { symbol, color } = trendArrow(sessions)

  return (
    <Link href={`/patients/${patient.id}`}>
      <div className={`bg-white border rounded-xl px-5 py-3.5 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer
        ${hasFlag ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
        {hasFlag && <span className="text-red-600 font-bold text-sm w-3">!</span>}
        <div className="flex-1 font-medium text-gray-900 truncate">{patient.name}</div>
        <RiskBadge label={patient.pod_risk_label} />
        <div className="text-sm text-gray-700 w-20 text-right tabular-nums">
          {latest?.cognitive_score != null ? `${latest.cognitive_score}/100` : '—'}
        </div>
        <div className={`w-5 text-center text-sm font-semibold ${color}`}>{symbol}</div>
        <div className="text-xs text-gray-400 w-24 text-right">
          {latest?.session_date ?? 'No session'}
        </div>
      </div>
    </Link>
  )
}
