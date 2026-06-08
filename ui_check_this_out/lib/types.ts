export type TrendStatus = 'Improving' | 'Stable' | 'Declining'
export type RiskLevel = 'High' | 'Med' | 'Low'

export interface Patient {
  id: string
  name: string
  shortName: string
  initials: string
  room: string
  age: number
  score: number
  previousScore: number
  trend: TrendStatus
  risk: RiskLevel
  dayOfRecovery: number
  surgeryType: string
  recommendation: string
  observation: string
  signals: ClinicalSignal[]
  chartData: ChartPoint[]
}

export interface ClinicalSignal {
  label: string
  value: string
  type: 'latency' | 'speech' | 'recall' | 'coherence'
  direction: 'up' | 'down' | 'neutral'
}

export interface ChartPoint {
  day: string
  score: number
}

export interface SurgeryType {
  value: string
  label: string
}
