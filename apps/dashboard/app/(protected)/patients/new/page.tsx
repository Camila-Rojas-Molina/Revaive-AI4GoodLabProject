'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Screen, TopBar, IconButton, Button, Card, Field,
  TextInput, CBSelect, SegRadio, Stepper, LoadingOverlay, Icon, toneVar,
} from '@/components/ui'
import { createPatientAccount } from './actions'

type RiskResult = { level: 'Low' | 'High'; tone: 'good' | 'danger'; confidence: number }
type FormData = { name: string; age: number; gender: string; admission: string; surgical: string; priorDelirium: string; dementia: string }
type Step = 'form' | 'calculating' | 'result' | 'credentials'

const GENDER = ['Female', 'Male', 'Non-binary / Prefer not to say']
const ADMISSION = ['Elective', 'Emergency', 'Urgent', 'Direct emergency', 'Same-day surgery']
const SURGICAL = [
  'CMED – Cardiac Medical',
  'CSURG – Cardiac Surgery',
  'DENT – Dental',
  'ENT – Ear, Nose & Throat',
  'EYE – Eye / Ophthalmology',
  'GU – Genitourinary',
  'GYN – Gynecological',
  'MED – General Medicine',
  'NB – Newborn',
  'NBB – Newborn Baby',
  'NMED – Neurologic Medical',
  'NSURG – Neurologic Surgery',
  'OBS – Obstetrics',
  'OMED – Oncologic Medical',
  'ORTHO – Orthopaedic',
  'PSURG – Plastic Surgery',
  'PSYCH – Psychiatric',
  'SURG – General Surgery',
  'TRAUM – Trauma',
  'TSURG – Thoracic Surgery',
  'VSURG – Vascular Surgery',
  'Unknown / Other',
]
const YNU = ['Yes', 'No', 'Unknown']

const COPY: Record<string, string> = {
  Low: 'Standard monitoring. Re-screen if condition changes.',
  High: 'Flag to care team. Begin intensive prevention and schedule daily cognitive sessions.',
}

export default function NewPatientPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [f, setF] = useState<FormData>({ name: '', age: 70, gender: '', admission: '', surgical: '', priorDelirium: '', dementia: '' })
  const [errs, setErrs] = useState<Partial<Record<keyof FormData, string>>>({})
  const [result, setResult] = useState<RiskResult | null>(null)
  const [savedPatientId, setSavedPatientId] = useState<string | null>(null)
  const [patientPin, setPatientPin] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
    if (!f.surgical) e.surgical = 'Select a service'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setStep('calculating')
    setSaveError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          name: f.name,
          anchor_age: f.age,
          gender: f.gender,
          admission_type: f.admission,
          surgical_category: f.surgical,
          prior_delirium: f.priorDelirium === 'Yes' ? 1 : 0,
          dementia: f.dementia === 'Yes' ? 1 : 0,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setSaveError(body?.detail ?? `Failed to save patient (${res.status}). Make sure the API server is running.`)
        setStep('form')
        return
      }

      const patient = await res.json()
      setSavedPatientId(patient.id)
      setResult({
        level: patient.pod_risk_label === 'high' ? 'High' : 'Low',
        tone: patient.pod_risk_label === 'high' ? 'danger' : 'good',
        confidence: patient.pod_risk_score,
      })
      setStep('result')
    } catch {
      setSaveError('Could not reach the API server. Make sure it is running on localhost:8000.')
      setStep('form')
    }
  }

  // Create the Supabase auth account and show the credentials screen.
  const addToWard = async () => {
    if (!savedPatientId) return
    setSaving(true)
    setSaveError(null)
    const { pin, error } = await createPatientAccount(savedPatientId, f.name)
    if (error) {
      setSaveError(error)
      setSaving(false)
      return
    }
    setPatientPin(pin ?? null)
    setStep('credentials')
    setSaving(false)
  }

  const done = [f.name.trim(), f.gender, f.admission, f.priorDelirium, f.dementia, f.surgical].filter(Boolean).length
  const total = 6

  if (step === 'calculating') return <LoadingOverlay title="Calculating risk…" sub="Analysing clinical factors" />

  // ── Credentials card shown after account creation ───────────────────────
  if (step === 'credentials' && savedPatientId && patientPin) {
    return (
      <Screen bg="var(--bg)" topBar={<TopBar title="Patient added to ward" />}>
        <div style={{ textAlign: 'center', padding: '28px 0 12px' }}>
          <Icon name="checkCircle" size={60} style={{ color: 'var(--good)' }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 16, lineHeight: 1.3 }}>
            {f.name} has been added.
          </div>
          <p style={{ fontSize: 15.5, color: 'var(--text-muted)', marginTop: 8, maxWidth: 340, margin: '8px auto 0' }}>
            Hand the details below to the patient so they can log in to Revaive.
          </p>
        </div>

        <Card style={{ marginTop: 28, marginBottom: 24 }} pad={0}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase',
            color: 'var(--text-faint)', padding: '18px 20px 10px' }}>
            Login credentials
          </div>

          {([
            { label: 'Name', value: f.name, mono: false, large: false },
            { label: 'Patient ID', value: savedPatientId, mono: true, large: false },
            { label: 'PIN', value: patientPin, mono: true, large: true },
          ] as const).map(({ label, value, mono, large }) => (
            <div key={label} style={{ padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-faint)',
                textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                {label}
              </div>
              <div style={{
                fontSize: large ? 40 : 15.5,
                fontWeight: large ? 800 : 600,
                color: 'var(--text)',
                fontFamily: mono ? 'monospace' : 'var(--font-ui)',
                wordBreak: 'break-all',
                letterSpacing: large ? '.2em' : mono ? '.05em' : 'normal',
              }}>
                {value}
              </div>
            </div>
          ))}
        </Card>

        <Button full size="lg" icon="arrowRight" onClick={() => router.push('/dashboard')}>
          Continue to ward list
        </Button>
      </Screen>
    )
  }

  // ── Risk result step ────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const tv = toneVar(result.tone)
    return (
      <Screen bg="var(--bg)" topBar={<TopBar title="Assessment result"
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
                strokeDashoffset={2 * Math.PI * 52 * (1 - result.confidence)}
                transform="rotate(-90 60 60)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 800, color: tv, lineHeight: 1,
                  fontFamily: 'var(--font-display)' }}>{result.level}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                  {result.confidence.toFixed(2)} confidence
                </div>
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
          {['Enrol in daily Revaive sessions', 'Share plan with patient & family', 'Schedule 48-hour re-screen'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
              <span style={{ color: 'var(--good)' }}><Icon name="checkCircle" size={24} /></span>
              <span style={{ fontSize: 16.5, color: 'var(--text)', fontWeight: 600 }}>{s}</span>
            </div>
          ))}
        </Card>

        {saveError && (
          <div style={{ fontSize: 15, color: 'var(--danger)', background: 'var(--danger-soft)',
            border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
            borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 12 }}>
            {saveError}
          </div>
        )}
        <Button full size="lg" icon={saving ? undefined : 'check'} loading={saving} onClick={addToWard}>
          {saving ? 'Creating account…' : 'Add patient to ward'}
        </Button>
        <div style={{ height: 12 }} />
        <Button full variant="ghost" disabled={saving} onClick={() => setStep('form')}>Back to form</Button>
      </Screen>
    )
  }

  // ── Intake form ─────────────────────────────────────────────────────────
  return (
    <Screen bg="var(--bg)" topBar={
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
        <Field label="Service administered" required hint="Clinical service area" error={errs.surgical}>
          <CBSelect value={f.surgical} onChange={v => set('surgical', v)} options={SURGICAL} placeholder="Select service" error={errs.surgical} />
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
          These factors support the delirium risk estimate and are intended to assist clinical judgement, not replace it.
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
