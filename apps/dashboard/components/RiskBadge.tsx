const STYLES = {
  high:   'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low:    'bg-green-100 text-green-800',
} as const

interface Props {
  label: 'high' | 'medium' | 'low' | null | undefined
  large?: boolean
}

export default function RiskBadge({ label, large }: Props) {
  if (!label) return null
  return (
    <span className={`inline-flex items-center font-medium capitalize rounded-full ${large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} ${STYLES[label]}`}>
      {label}
    </span>
  )
}
