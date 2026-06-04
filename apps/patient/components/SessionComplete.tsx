import Link from 'next/link'

interface Props {
  score: number
  name: string
  inline?: boolean
}

function encouragement(score: number): string {
  if (score >= 80) return 'Outstanding session!'
  if (score >= 65) return 'Great work today!'
  if (score >= 50) return 'Good session today.'
  return 'Thanks for completing your session.'
}

export default function SessionComplete({ score, name, inline }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="text-6xl font-bold text-blue-600 tabular-nums">{Math.round(score)}</div>
      <div className="text-lg text-gray-500">out of 100</div>
      <p className="text-2xl font-medium mt-2">{encouragement(score)}</p>
      {!inline && (
        <Link
          href="/session"
          className="mt-6 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Done
        </Link>
      )}
    </div>
  )
}
