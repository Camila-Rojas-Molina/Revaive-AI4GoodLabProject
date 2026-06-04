import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import RiskBadge from '@/components/RiskBadge'
import ScoreChart from '@/components/ScoreChart'
import ReportCard from '@/components/ReportCard'
import Link from 'next/link'

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const headers = { Authorization: `Bearer ${session.access_token}` }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const [patientRes, trendRes, reportsRes] = await Promise.all([
    fetch(`${apiUrl}/patients/${params.id}`, { headers, cache: 'no-store' }),
    fetch(`${apiUrl}/scores/${params.id}/trend`, { headers, cache: 'no-store' }),
    fetch(`${apiUrl}/reports/${params.id}`, { headers, cache: 'no-store' }),
  ])

  if (!patientRes.ok) notFound()

  const patient = await patientRes.json()
  const trend = trendRes.ok ? await trendRes.json() : []
  const reports = reportsRes.ok ? await reportsRes.json() : []

  const latestSession = patient.sessions?.[0]
  const hasEscalation = patient.sessions?.some((s: { flag_escalate: boolean }) => s.flag_escalate)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
        <h1 className="text-xl font-semibold">{patient.name}</h1>
        <RiskBadge label={patient.pod_risk_label} />
        {hasEscalation && (
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
            ESCALATE
          </span>
        )}
      </div>

      {hasEscalation && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          A recent session showed a significant cognitive decline. Clinical review recommended.
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-medium mb-4">Cognitive Score Trend</h2>
        {trend.length > 0 ? (
          <ScoreChart data={trend} />
        ) : (
          <p className="text-sm text-gray-400">No session data yet.</p>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-medium mb-4">Risk Assessment</h2>
        <div className="flex items-center gap-3 mb-4">
          <RiskBadge label={patient.pod_risk_label} />
          <span className="text-sm text-gray-500">
            Model score: {((patient.pod_risk_score ?? 0) * 10).toFixed(1)}/10
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ['Age', patient.age ?? '—'],
            ['Sex', patient.sex ?? '—'],
            ['Surgery type', patient.surgery_type ?? '—'],
            ['Anesthesia duration', patient.anesthesia_duration_min ? `${patient.anesthesia_duration_min} min` : '—'],
            ['Comorbidity count', patient.comorbidity_count ?? 0],
            ['Baseline orientation', patient.baseline_orientation_score != null ? `${patient.baseline_orientation_score}/10` : '—'],
          ].map(([label, value]) => (
            <>
              <dt key={`dt-${label}`} className="text-gray-500">{label}</dt>
              <dd key={`dd-${label}`} className="text-gray-900">{value}</dd>
            </>
          ))}
        </dl>
      </section>

      {latestSession && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-medium mb-3">Latest Session Transcript</h2>
          <details className="group">
            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 list-none">
              {latestSession.session_date} · Score: {latestSession.cognitive_score ?? '—'}/100 · Click to expand
            </summary>
            <pre className="mt-3 text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-lg p-4 leading-relaxed">
              {latestSession.transcript || 'No transcript available.'}
            </pre>
          </details>
        </section>
      )}

      {reports.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-medium mb-3">Latest Report</h2>
          <ReportCard report={reports[0]} />
        </section>
      )}
    </div>
  )
}
