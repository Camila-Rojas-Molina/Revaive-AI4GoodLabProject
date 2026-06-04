interface Report {
  report_date: string
  score_today: number | null
  score_delta: number | null
  trend_direction: 'improving' | 'declining' | 'stable'
  recommendation: string | null
  body_text: string | null
}

const TREND_COLORS = {
  improving: 'text-green-700 bg-green-50',
  declining: 'text-red-700 bg-red-50',
  stable: 'text-gray-700 bg-gray-50',
}

export default function ReportCard({ report }: { report: Report }) {
  const deltaStr =
    report.score_delta != null
      ? report.score_delta > 0 ? `+${report.score_delta.toFixed(1)}` : `${report.score_delta.toFixed(1)}`
      : 'N/A'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm flex-wrap">
        <span className="text-gray-500">{report.report_date}</span>
        {report.score_today != null && (
          <span className="font-semibold text-gray-900">{report.score_today}/100</span>
        )}
        <span className="text-gray-500">Δ {deltaStr}</span>
        {report.trend_direction && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TREND_COLORS[report.trend_direction]}`}>
            {report.trend_direction}
          </span>
        )}
      </div>
      {report.recommendation && (
        <p className="text-sm text-gray-700">{report.recommendation}</p>
      )}
    </div>
  )
}
