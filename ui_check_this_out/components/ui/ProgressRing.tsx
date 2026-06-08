interface ProgressRingProps {
  value: number       // 0–100
  size?: number       // px
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string      // center label override
}

export default function ProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  color = '#002021',
  trackColor = '#bfc8c8',
}: ProgressRingProps) {
  const radius = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ

  return (
    <svg
      width={size}
      height={size}
      style={{ transform: 'rotate(-90deg)' }}
      aria-label={`${value}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  )
}
