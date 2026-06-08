interface ScoreRingProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
}

export default function ScoreRing({ value, size = 192, strokeWidth = 12, color = '#003739' }: ScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#dce5df"
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
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl leading-none text-brand-700 font-sans">{value}</span>
        <span className="text-base text-surface-tertiary mt-1">/ 100</span>
      </div>
    </div>
  )
}
