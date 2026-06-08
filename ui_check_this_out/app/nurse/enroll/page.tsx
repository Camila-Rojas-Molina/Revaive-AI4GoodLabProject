'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import NurseBottomNav from '@/components/nurse/BottomNav'
import { surgeryTypes } from '@/lib/data'
import { RiskLevel } from '@/lib/types'

const CONDITIONS = [
  'Hypertension',
  'Diabetes',
  'Prior Cognitive Impairment',
  'Heart Disease',
  'Renal Impairment',
  'Obesity',
]

function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  suffix,
}: {
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-surface-secondary tracking-label">{label}</label>
      <div className="flex items-center bg-white border border-surface-border rounded-xl h-[52px] px-4 gap-2 focus-within:border-brand-600 transition-colors">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-base text-surface-primary placeholder:text-surface-tertiary outline-none"
        />
        {suffix && <span className="text-sm text-surface-tertiary shrink-0">{suffix}</span>}
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-surface-secondary tracking-label">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-surface-border rounded-xl h-[52px] px-4 text-base text-surface-primary outline-none focus:border-brand-600 transition-colors pr-10"
        >
          <option value="">Select type…</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-tertiary pointer-events-none" />
      </div>
    </div>
  )
}

type RiskResult = {
  level: RiskLevel
  score: number
  factors: string[]
}

function calcRisk(form: { age: string; surgery: string; anesthesiaDuration: string; conditions: string[] }): RiskResult {
  let score = 0
  const factors: string[] = []

  const age = parseInt(form.age)
  if (!isNaN(age)) {
    if (age >= 75) { score += 30; factors.push('Age 75+') }
    else if (age >= 65) { score += 20; factors.push('Age 65+') }
    else if (age >= 50) { score += 10; factors.push('Age 50+') }
  }

  const hrs = parseFloat(form.anesthesiaDuration)
  if (!isNaN(hrs)) {
    if (hrs >= 4) { score += 25; factors.push('Long anesthesia (4h+)') }
    else if (hrs >= 2) { score += 15; factors.push('Moderate anesthesia (2h+)') }
  }

  if (form.surgery === 'cardiac') { score += 20; factors.push('Cardiac surgery') }
  if (form.surgery === 'neurological') { score += 25; factors.push('Neurological surgery') }

  if (form.conditions.includes('Prior Cognitive Impairment')) { score += 20; factors.push('Prior cognitive impairment') }
  if (form.conditions.includes('Diabetes')) { score += 10; factors.push('Diabetes') }
  if (form.conditions.includes('Heart Disease')) { score += 10; factors.push('Heart disease') }

  const level: RiskLevel = score >= 60 ? 'High' : score >= 30 ? 'Med' : 'Low'
  return { level, score: Math.min(score, 100), factors }
}

export default function EnrollPage() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [surgery, setSurgery] = useState('')
  const [surgeryDuration, setSurgeryDuration] = useState('')
  const [anesthesiaDuration, setAnesthesiaDuration] = useState('')
  const [conditions, setConditions] = useState<string[]>([])
  const [result, setResult] = useState<RiskResult | null>(null)

  function toggleCondition(c: string) {
    setConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  function handleCalculate() {
    const r = calcRisk({ age, surgery, anesthesiaDuration, conditions })
    setResult(r)
  }

  const riskColors: Record<RiskLevel, { bg: string; text: string; border: string; bar: string; dot: string }> = {
    High: { bg: 'bg-error-light', text: 'text-error', border: 'border-error', bar: 'bg-error', dot: 'bg-error' },
    Med:  { bg: 'bg-warning-light', text: 'text-warning', border: 'border-warning', bar: 'bg-warning', dot: 'bg-warning' },
    Low:  { bg: 'bg-success-light', text: 'text-success', border: 'border-success', bar: 'bg-success', dot: 'bg-success' },
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-bg border-b-2 border-surface-border flex items-center gap-3 px-5 pt-5 pb-[22px]">
        <Link href="/nurse" className="p-2 -ml-2" aria-label="Back">
          <ChevronLeft size={22} className="text-surface-primary" />
        </Link>
        <h1 className="text-xl font-bold text-surface-primary">Enroll New Patient</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 scrollbar-hide">
        {/* Description */}
        <p className="text-base text-surface-secondary leading-7">
          Enter patient intake information to calculate post-operative cognitive risk and enroll them in the monitoring program.
        </p>

        {/* Form card */}
        <div className="bg-white border border-surface-border rounded-2xl p-5 flex flex-col gap-5">
          <h2 className="text-base font-semibold text-surface-primary">Patient Information</h2>

          <InputField label="Full Name" placeholder="e.g. Eleanor Miller" value={name} onChange={setName} />
          <InputField label="Age" type="number" placeholder="e.g. 72" value={age} onChange={setAge} suffix="yrs" />
          <SelectField label="Surgery Type" value={surgery} onChange={setSurgery} options={surgeryTypes} />
          <InputField label="Surgery Duration" type="number" placeholder="e.g. 3.5" value={surgeryDuration} onChange={setSurgeryDuration} suffix="hrs" />
          <InputField label="Anesthesia Duration" type="number" placeholder="e.g. 4.0" value={anesthesiaDuration} onChange={setAnesthesiaDuration} suffix="hrs" />

          {/* Conditions */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-surface-secondary tracking-label">Pre-existing Conditions</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map(c => {
                const checked = conditions.includes(c)
                return (
                  <button
                    key={c}
                    onClick={() => toggleCondition(c)}
                    className={`text-sm font-semibold px-3 py-2.5 rounded-xl border-2 text-left transition-colors ${
                      checked
                        ? 'bg-brand-100 border-brand-600 text-brand-700'
                        : 'bg-surface-bg border-surface-border text-surface-secondary'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Calculate button */}
        <button
          onClick={handleCalculate}
          disabled={!name || !age || !surgery}
          className="w-full h-[56px] bg-brand-700 text-white text-base font-semibold rounded-2xl disabled:opacity-40 transition-opacity"
        >
          Calculate Risk &amp; Enroll
        </button>

        {/* Result */}
        {result && (
          <div className={`border-2 rounded-2xl p-5 flex flex-col gap-4 ${riskColors[result.level].bg} ${riskColors[result.level].border}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-surface-primary">Risk Assessment</h3>
              <span className={`text-xl font-bold ${riskColors[result.level].text}`}>
                {result.level === 'Med' ? 'Moderate' : result.level} Risk
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-secondary font-semibold">Risk Score</span>
                <span className={`font-bold ${riskColors[result.level].text}`}>{result.score}/100</span>
              </div>
              <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${riskColors[result.level].bar}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>

            {result.factors.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold tracking-overline uppercase text-surface-tertiary">Contributing Factors</span>
                {result.factors.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${riskColors[result.level].dot}`} />
                    <span className="text-sm text-surface-secondary">{f}</span>
                  </div>
                ))}
              </div>
            )}

            <button className="w-full h-[52px] bg-brand-700 text-white text-base font-semibold rounded-xl mt-2">
              Confirm Enrollment for {name}
            </button>
          </div>
        )}
      </main>

      <NurseBottomNav />
    </div>
  )
}
