'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Screen, TopBar, Card, Button, IconButton, Icon } from '@/components/ui'

const QUESTIONS = [
  {
    id: 'feeling',
    question: 'How are you feeling right now?',
    minLabel: 'Very tired',
    midLabel: 'Okay',
    maxLabel: 'Very energised',
  },
  {
    id: 'comfort',
    question: 'How comfortable did you feel talking to Revi?',
    minLabel: 'Uncomfortable',
    midLabel: 'Neutral',
    maxLabel: 'Very comfortable',
  },
  {
    id: 'length',
    question: 'Was the session the right length?',
    minLabel: 'Too short',
    midLabel: 'Just right',
    maxLabel: 'Too long',
  },
  {
    id: 'difficulty',
    question: 'Did anything feel confusing or difficult?',
    minLabel: 'Not at all',
    midLabel: 'A little',
    maxLabel: 'Very much so',
  },
]

// CSS custom property --pct drives the track fill.
// WebKit ignores `background` on the input itself; it must be set on
// ::-webkit-slider-runnable-track. Custom properties cascade into pseudo-elements.
const SLIDER_STYLE = `
  @keyframes feedbackFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: none; }
  }
  .feedback-page {
    animation: feedbackFadeUp .38s cubic-bezier(.22,.68,0,1.2) both;
  }
  .revi-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 999px;
    outline: none;
    cursor: pointer;
    background: transparent;
  }
  .revi-slider::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--primary) var(--pct, 50%),
      var(--line)    var(--pct, 50%)
    );
  }
  .revi-slider::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--primary) var(--pct, 50%),
      var(--line)    var(--pct, 50%)
    );
  }
  .revi-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--primary);
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(14,59,56,0.35);
    cursor: grab;
    transition: transform .1s;
    margin-top: -11px;
  }
  .revi-slider:active::-webkit-slider-thumb { cursor: grabbing; transform: scale(1.15); }
  .revi-slider::-moz-range-thumb {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--primary); border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(14,59,56,0.35); cursor: grab;
  }
  .revi-slider:active::-moz-range-thumb { cursor: grabbing; }
`

function SliderQuestion({
  question, minLabel, midLabel, maxLabel, value, onChange,
}: {
  question: string
  minLabel: string
  midLabel: string
  maxLabel: string
  value: number
  onChange: (v: number) => void
}) {
  const pct = ((value - 1) / 4) * 100

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text)', marginBottom: 20, lineHeight: 1.4 }}>
        {question}
      </div>

      <input
        type="range"
        min={1} max={5} step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="revi-slider"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 10 }}>
        <span style={{ fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.35 }}>
          {minLabel}
        </span>
        <span style={{ fontSize: 14.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.35 }}>
          {midLabel}
        </span>
        <span style={{ fontSize: 14.5, color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.35 }}>
          {maxLabel}
        </span>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, number>>({
    feeling: 3, comfort: 3, length: 3, difficulty: 3,
  })
  const [notes, setNotes] = useState('')

  const set = (id: string, v: number) => setValues(prev => ({ ...prev, [id]: v }))
  const finish = () => router.push('/session')

  return (
    <Screen
      bg="var(--bg)"
      topBar={
        <TopBar
          title="Session complete"
          left={<IconButton name="chevLeft" label="Back" onClick={() => router.back()} />}
        />
      }
    >
      <style>{SLIDER_STYLE}</style>

      <div className="feedback-page">
        {/* Congratulations header */}
        <div style={{
          textAlign: 'center', padding: '8px 0 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <span style={{
            width: 68, height: 68, borderRadius: '50%',
            background: 'var(--good-soft)', display: 'grid', placeItems: 'center',
          }}>
            <Icon name="checkCircle" size={36} style={{ color: 'var(--good)' }} />
          </span>
          <div>
            <div style={{
              fontSize: 26, fontWeight: 800, color: 'var(--primary-2)',
              fontFamily: 'var(--font-display)', letterSpacing: '-.02em', marginBottom: 6,
            }}>
              Great work today!
            </div>
            <p style={{ fontSize: 15.5, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.55, maxWidth: 320 }}>
              You completed your session. Take a moment to share how it felt — it only takes a minute.
            </p>
            {/* Skip link right under the message */}
            <button
              onClick={finish}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--surface)', border: '1.5px solid var(--line)',
                borderRadius: 999, cursor: 'pointer',
                padding: '9px 20px', marginTop: 4,
                fontSize: 14.5, fontWeight: 600, color: 'var(--text-muted)',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Skip for now
            </button>
          </div>
        </div>

        <Card pad={24} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {QUESTIONS.map(q => (
              <SliderQuestion
                key={q.id}
                question={q.question}
                minLabel={q.minLabel}
                midLabel={q.midLabel}
                maxLabel={q.maxLabel}
                value={values[q.id]}
                onChange={v => set(q.id, v)}
              />
            ))}
          </div>
        </Card>

        <Card pad={24} style={{ marginBottom: 28 }}>
          <label htmlFor="feedback-notes" style={{
            fontSize: 16.5, fontWeight: 700, color: 'var(--text)',
            display: 'block', marginBottom: 12,
          }}>
            Anything else you&apos;d like to share?
          </label>
          <textarea
            id="feedback-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional — your nurse will see this."
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)',
              background: 'var(--surface)', color: 'var(--text)',
              fontFamily: 'var(--font-ui)', fontSize: 15.5,
              padding: '12px 14px', resize: 'none',
              outline: 'none', lineHeight: 1.5,
              transition: 'border-color .15s',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--ring)')}
            onBlur={e => (e.target.style.borderColor = 'var(--line)')}
          />
        </Card>

        <Button full size="lg" icon="arrowRight" onClick={finish}>
          Submit &amp; finish
        </Button>
      </div>
    </Screen>
  )
}
