'use client'

import type { ChartPoint } from '@/lib/types'

interface LineChartProps {
  data: ChartPoint[]
  color?: string
  declining?: boolean
}

export default function LineChart({ data, color = '#003739', declining = false }: LineChartProps) {
  const W = 300
  const H = 160
  const padTop = 16
  const padBot = 32
  const padL = 8
  const padR = 8

  const validData = data.filter(d => d.score > 0)
  if (validData.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-surface-tertiary text-sm">
        Not enough data yet
      </div>
    )
  }

  const scores = validData.map(d => d.score)
  const minS = Math.min(...scores) - 8
  const maxS = Math.max(...scores) + 8
  const innerW = W - padL - padR
  const innerH = H - padTop - padBot

  const xOf = (i: number) => padL + (i / (validData.length - 1)) * innerW
  const yOf = (s: number) => padTop + (1 - (s - minS) / (maxS - minS)) * innerH

  const pathD = validData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(d.score)}`).join(' ')
  const lastX = xOf(validData.length - 1)
  const lastY = yOf(validData[validData.length - 1].score)

  const dotColor = declining ? '#d32f2f' : color

  const gridYs = [0.25, 0.5, 0.75, 1].map(t => padTop + t * innerH)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Cognitive score trend chart">
      {gridYs.map((y, i) => (
        <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(191,200,200,0.4)" strokeWidth={1} />
      ))}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={5} fill={dotColor} />
      {data.map((d, i) => {
        const vi = validData.findIndex(v => v.day === d.day)
        const x = vi >= 0 ? xOf(vi) : padL + (i / (data.length - 1)) * innerW
        const isLast = i === data.length - 1
        return (
          <text
            key={d.day}
            x={x}
            y={H - 4}
            textAnchor="middle"
            fontSize={11}
            fill={isLast ? '#002021' : '#696f70'}
            fontWeight={isLast ? '700' : '400'}
          >
            {d.day}
          </text>
        )
      })}
    </svg>
  )
}
