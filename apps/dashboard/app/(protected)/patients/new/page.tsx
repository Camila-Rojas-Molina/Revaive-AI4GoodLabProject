'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Screen, TopBar, IconButton, Button, Card, Field,
  TextInput, CBSelect, SegRadio, Stepper, LoadingOverlay, Icon, toneVar,
} from '@/components/ui'

type RiskResult = { level: 'Low' | 'Moderate' | 'High'; tone: 'good' | 'warn' | 'danger'; score: number }
type FormData = { name: string; age: number; gender: string; admission: string; surgical: string; priorDelirium: string; dementia: string }
type Step = 'form' | 'calculating' | 'result'

const GENDER = ['Female', 'Male', 'Non-binary', 'Prefer not to say']
const ADMISSION = ['Elective surgery', 'Emergency admission', 'Inter-hospital transfer', 'Observation']
const SURGICAL = ['Cardiac', 'Orthopedic', 'Abdominal / GI', 'Neurosurgical', 'Vascular', 'Thoracic', 'Other']
const YNU = ['Yes', 'No', 'Unknown']

function computeRisk(f: FormData): RiskResult {
  let s = 0
  if (f.age >= 80) s += 2; else if (f.age >= 70) s += 1
  if (f.admission === 'Emergency admission') s += 2
  else if (f.admission === 'Inter-hospital transfer') s += 1
  if (f.priorDelirium === 'Yes') s += 3; else if (f.priorDelirium === 'Unknown') s += 1
  if (f.dementia === 'Yes') s += 3; else if (f.dementia === 'Unknown') s += 1
  if (['Cardiac', 'Neurosurgical', 'Vascular'].includes(f.surgical)) s += 2
  else if (f.surgical && f.surgical !== 'Other') s += 1
  if (s >= 7) return { level: 'High', tone: 'danger', score: s }
  if (s >= 4) return { level: 'Moderate', tone: 'warn', score: s }
  return { level: 'Low', tone: 'good', score: s }
}

const COPY: Record<string, string> = {
  Low: 'Standard monitoring. Re-screen if condition changes.',
  Moderate: 'Initiate preventive bundle: reorientation, sleep hygiene, early mobilisation. Re-screen daily.',
  High: 'Flag to care team. Begin intensive prevention and schedule daily cognitive sessions.',
}

export default function NewPatientPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [f, setF] = useState<FormData>({ name: '', age: 70, gender: '', admission: '', surgical: '', priorDelirium: '', dementia: '' })
  const [errs, setErrs] = useState<Partial<Record<keyof FormData, string>>>({})
  const [result, setResult] = useState<RiskResult | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (k: keyof FormData, v: string | number) => {
    setF(s => ({ ...s, [k]: v }))
    setErrs(e => ({ ...e, [k]: undefined }))
  }

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!f.name.trim()) e.name = 'Please enter the patient name'
    if (!f.gender) e.gender = 'Select a gender'
    if (!f.admission) e.admission = 'Select an admission type'
    if (!f.priorDelirium) e.priorDelirium = 'Required'
    if (!f.dementia) e.dementia = 'Required'
    if (!f.surgical) e.surgical = 'Select a surgical category'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const submit = () => {
    if (!validate()) return
    setStep('calculating')
    setTimeout(() => { setResult(computeRisk(f)); setStep('result') }, 950)
  }

  const save = async () => {
    if (!result) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const comorbidities = [f.priorDelirium === 'Yes' ? 1 : 0, f.dementia === 'Yes' ? 1 : 0].reduce((a, b) => a + b, 0)
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: f.name, age: f.age, sex: f.gender, surgery_type: f.surgical, comorbidity_count: comorbidities }),
      })
      router.push('/dashboard')
    } catch {
      setSaving(false)
    }
  }

  const done = [f.name.trim(), f.gender, f.admission, f.priorDelirium, f.dementia, f.surgical].filter(Boolean).length
  const total = 6

  if (step === 'calculating') return <LoadingOverlay title="Calculating risk…" sub="Analysing clinical factors" />

  if (step === 'result' && result) {
    const tv = toneVar(result.tone)
    return (
      <Screen topBar={<TopBar title="Assessment result"
        left={<IconButton name="chevLeft" label="Back" onClick={() => setStep('form')} />} />}>

        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 600 }}>
            {f.name} · {f.age} yrs
          </div>
        </div>

        <Card style={{ textAlign: 'center', marginTop: 18, marginBottom: 18, borderColor: tv, borderWidth: 2 }} pad={32}>
          <div style={{ fontSize: 14, letterSpacing: '.14em', fontWeight: 700, color: 'var(--text-faint)',
            textTransform: 'uppercase', marginBottom: 18 }}>Delirium risk</div>
          <div style={{ position: 'relative', width: 170, height: 170, margin: '0 auto 18px' }}>
            <svg viewBox="0 0 120 120" width="170" height="170">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-2)" strokeWidth="12" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={tv} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - Math.min(result.score / 12, 1))}
                transform="rotate(-90 60 60)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 800, color: tv, lineHeight: 1,
                  fontFamily: 'var(--font-display)' }}>{result.level}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>score {result.score}/12</div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 16.5, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 480, margin: '0 auto' }}>
            {COPY[result.level]}
          </p>
        </Card>

        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            color: 'var(--text-faint)', marginBottom: 14 }}>Recommended next steps</div>
          {['Enrol in daily CogBridge sessions', 'Share plan with patient & family', 'Schedule 48-hour re-screen'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
              <span style={{ color: 'var(--good)' }}><Icon name="checkCircle" size={24} /></span>
              <span style={{ fontSize: 16.5, color: 'var(--text)', fontWeight: 600 }}>{s}</span>
            </div>
          ))}
        </Card>

        <Button full size="lg" icon={saving ? undefined : 'check'} loading={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save & add to ward list'}
        </Button>
        <div style={{ height: 12 }} />
        <Button full variant="ghost" disabled={saving} onClick={() => setStep('form')}>Edit assessment</Button>
      </Screen>
    )
  }

  return (
    <Screen topBar={
      <TopBar title="New assessment" sub={`${done} of ${total} complete`}
        left={<IconButton name="chevLeft" label="Cancel" onClick={() => router.push('/dashboard')} />} />
    }
      bottomNav={
        <div style={{ padding: '14px var(--pad) 20px', background: 'var(--surface)', borderTop: '1px solid var(--line)' }}>
          <Button full size="lg" iconRight="arrowRight" onClick={submit}>Calculate delirium risk</Button>
        </div>
      }>

      <div style={{ height: 8, borderRadius: 5, background: 'var(--surface-2)', overflow: 'hidden', marginBottom: 26 }}>
        <div style={{ width: `${(done / total) * 100}%`, height: '100%', background: 'var(--primary)',
          borderRadius: 5, transition: 'width .25s' }} />
      </div>

      <FormGroup title="Patient details">
        <Field label="Full name" required htmlFor="f-name" error={errs.name}>
          <TextInput id="f-name" value={f.name} onChange={v => set('name', v)} placeholder="e.g. John Mensah" error={errs.name} />
        </Field>
        <Field label="Age" required htmlFor="f-age">
          <Stepper id="f-age" value={f.age} onChange={v => set('age', v)} min={18} max={110} unit="yrs" />
        </Field>
        <Field label="Gender" required error={errs.gender}>
          <CBSelect value={f.gender} onChange={v => set('gender', v)} options={GENDER} placeholder="Select gender" error={errs.gender} />
        </Field>
      </FormGroup>

      <FormGroup title="Admission">
        <Field label="Admission type" required error={errs.admission}>
          <CBSelect value={f.admission} onChange={v => set('admission', v)} options={ADMISSION} placeholder="Select admission type" error={errs.admission} />
        </Field>
        <Field label="Surgical category" required hint="Primary procedure category" error={errs.surgical}>
          <CBSelect value={f.surgical} onChange={v => set('surgical', v)} options={SURGICAL} placeholder="Select surgical category" error={errs.surgical} />
        </Field>
      </FormGroup>

      <FormGroup title="Cognitive history">
        <Field label="Prior history of delirium" required error={errs.priorDelirium}>
          <SegRadio value={f.priorDelirium} onChange={v => set('priorDelirium', v)} options={YNU} error={errs.priorDelirium} />
        </Field>
        <Field label="Diagnosis of dementia" required error={errs.dementia}>
          <SegRadio value={f.dementia} onChange={v => set('dementia', v)} options={YNU} error={errs.dementia} />
        </Field>
      </FormGroup>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 18px',
        background: 'var(--surface-2)', borderRadius: 'var(--r-md)', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}><Icon name="info" size={22} /></span>
        <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          These factors feed a delirium-risk estimate. It supports — but does not replace — clinical judgement.
        </p>
      </div>
    </Screen>
  )
}

const FormGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card style={{ marginBottom: 18 }} pad={24}>
    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
      color: 'var(--text-faint)', marginBottom: 18 }}>{title}</div>
    {children}
  </Card>
)
