'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'

/* ─── ICON ──────────────────────────────────────────────────────────── */
export const Icon = ({ name, size = 24, stroke = 2, style }: {
  name: string; size?: number; stroke?: number; style?: React.CSSProperties
}) => {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const, style, 'aria-hidden': true,
  }
  const paths: Record<string, React.ReactNode> = {
    logo: <><rect x="3" y="4" width="14" height="16" rx="2"/><path d="M7 9h6M7 13h4"/><circle cx="18.5" cy="15.5" r="2.6"/><path d="M16.7 17.3 15 19"/></>,
    bell: <><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/></>,
    home: <><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9.5h12V10"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7.5 14 3-3.5 2.5 2.5 4-5"/></>,
    user: <><circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/></>,
    play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>,
    pause: <><rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none"/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></>,
    check: <path d="m5 12.5 4.5 4.5L19 7"/>,
    checkCircle: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9.5"/></>,
    chevDown: <path d="m6 9 6 6 6-6"/>,
    chevLeft: <path d="m15 6-6 6 6 6"/>,
    chevRight: <path d="m9 6 6 6-6 6"/>,
    x: <path d="M6 6l12 12M18 6 6 18"/>,
    arrowRight: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    logout: <><path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/><path d="m16 8 4 4-4 4M9 12h11"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6"/></>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></>,
    flame: <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2c1.5 0 1.5-2 1-4-.4-1.7 1-4 1-4Z"/>,
    text: <><path d="M5 7V5h14v2M12 5v14M9 19h6"/></>,
    motion: <><circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/></>,
    spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>,
    alert: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4M12 17.5v.01"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></>,
    heart: <path d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7-1.5C19 10.6 12 20 12 20Z"/>,
    waveform: <><path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0"/></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/></>,
    edit: <><path d="M14.5 5.5 18.5 9.5"/><path d="M4 20l1-4L16 5a2 2 0 0 1 3 3L8 19l-4 1Z"/></>,
    stethoscope: <><path d="M6 4v5a4 4 0 0 0 8 0V4"/><path d="M10 17v0a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="13" r="2"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></>,
    dotsV: <><circle cx="12" cy="5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    stop: <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none"/>,
  }
  return <svg {...p}>{paths[name] ?? null}</svg>
}

/* ─── BUTTON ─────────────────────────────────────────────────────────── */
export const Button = ({ children, onClick, variant = 'primary', size = 'lg', icon, iconRight, full, disabled, loading, danger }: {
  children: React.ReactNode; onClick?: () => void
  variant?: 'primary' | 'soft' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'; icon?: string; iconRight?: string
  full?: boolean; disabled?: boolean; loading?: boolean; danger?: boolean
}) => {
  const isOff = disabled || loading
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 11,
    fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: isOff ? 'not-allowed' : 'pointer',
    border: '1px solid transparent', borderRadius: 18, transition: 'transform .1s, background .15s',
    width: full ? '100%' : 'auto', opacity: disabled ? .5 : 1,
    minHeight: size === 'lg' ? 64 : size === 'md' ? 54 : 46,
    fontSize: size === 'lg' ? 19 : size === 'md' ? 17 : 15,
    padding: size === 'lg' ? '0 30px' : '0 22px',
  }
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: danger ? 'var(--danger)' : 'var(--primary)', color: 'var(--on-primary)', boxShadow: '0 10px 24px -12px rgba(16,46,44,.5)' },
    soft: { background: 'var(--primary-soft)', color: 'var(--primary)' },
    outline: { background: 'var(--surface)', color: danger ? 'var(--danger)' : 'var(--primary)', borderColor: danger ? 'var(--danger)' : 'var(--line-strong)' },
    ghost: { background: 'transparent', color: danger ? 'var(--danger)' : 'var(--primary)' },
  }
  return (
    <button onClick={isOff ? undefined : onClick} disabled={isOff} style={{ ...base, ...variants[variant] }}
      onMouseDown={e => !isOff && ((e.currentTarget as HTMLElement).style.transform = 'scale(.975)')}
      onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}>
      {loading && <Spinner size={size === 'lg' ? 22 : 19} color="var(--on-primary)" />}
      {!loading && icon && <Icon name={icon} size={size === 'lg' ? 23 : 20} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={size === 'lg' ? 23 : 20} />}
    </button>
  )
}

/* ─── CARD ───────────────────────────────────────────────────────────── */
export const Card = ({ children, style, pad = 24, onClick }: {
  children: React.ReactNode; style?: React.CSSProperties; pad?: number; onClick?: () => void
}) => (
  <div onClick={onClick} style={{
    background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)',
    padding: pad, boxShadow: 'var(--shadow-card)', cursor: onClick ? 'pointer' : 'default',
    transition: 'transform .12s, box-shadow .15s', ...style,
  }}
    onMouseEnter={onClick ? e => { (e.currentTarget as HTMLElement).style.cssText += ';transform:translateY(-2px);box-shadow:var(--shadow-pop)' } : undefined}
    onMouseLeave={onClick ? e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)' } : undefined}>
    {children}
  </div>
)

/* ─── PILL ───────────────────────────────────────────────────────────── */
export const Pill = ({ children, tone = 'neutral' }: {
  children: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'primary'
}) => {
  const tones: Record<string, React.CSSProperties> = {
    neutral: { background: 'var(--surface-2)', color: 'var(--text-muted)' },
    good: { background: 'color-mix(in srgb, var(--good) 16%, var(--surface))', color: 'var(--good)' },
    warn: { background: 'color-mix(in srgb, var(--warn) 18%, var(--surface))', color: 'var(--warn)' },
    danger: { background: 'var(--danger-soft)', color: 'var(--danger)' },
    primary: { background: 'var(--primary-soft)', color: 'var(--primary)' },
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px',
      borderRadius: 999, fontSize: 13.5, fontWeight: 700, ...tones[tone] }}>
      {children}
    </span>
  )
}

/* ─── FORMS ──────────────────────────────────────────────────────────── */
export const Field = ({ label, hint, error, required, children, htmlFor }: {
  label: string; hint?: string; error?: string | null; required?: boolean
  children: React.ReactNode; htmlFor?: string
}) => (
  <div style={{ marginBottom: 22 }}>
    <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 9 }}>
      {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>}
    </label>
    {hint && <div style={{ fontSize: 14, color: 'var(--text-muted)', margin: '-3px 0 9px' }}>{hint}</div>}
    {children}
    {error && <div style={{ fontSize: 14, color: 'var(--danger)', marginTop: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon name="alert" size={16} />{error}
    </div>}
  </div>
)

const inputBase: React.CSSProperties = {
  width: '100%', minHeight: 'var(--tap)', padding: '0 18px', fontSize: 18,
  fontFamily: 'var(--font-ui)', color: 'var(--text)', background: 'var(--surface)',
  border: '1.5px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none',
  boxSizing: 'border-box',
}

export const TextInput = ({ id, value, onChange, placeholder, type = 'text', error }: {
  id?: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; error?: string | null
}) => {
  const [foc, setFoc] = useState(false)
  return (
    <input id={id} type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)} onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{ ...inputBase,
        borderColor: error ? 'var(--danger)' : foc ? 'var(--ring)' : 'var(--line-strong)',
        boxShadow: foc ? '0 0 0 4px color-mix(in srgb, var(--ring) 18%, transparent)' : 'none' }} />
  )
}

export const CBSelect = ({ id, value, onChange, options, placeholder = 'Select…', error }: {
  id?: string; value: string; onChange: (v: string) => void
  options: string[]; placeholder?: string; error?: string | null
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ ...inputBase, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left',
          borderColor: error ? 'var(--danger)' : open ? 'var(--ring)' : 'var(--line-strong)',
          boxShadow: open ? '0 0 0 4px color-mix(in srgb, var(--ring) 18%, transparent)' : 'none' }}>
        <span style={{ color: value ? 'var(--text)' : 'var(--text-faint)' }}>{value || placeholder}</span>
        <Icon name="chevDown" size={22} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s', flexShrink: 0 }} />
      </button>
      {open && (
        <ul style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50,
          margin: 0, padding: 8, listStyle: 'none', maxHeight: 320, overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-pop)' }}>
          {options.map(o => (
            <li key={o} onClick={() => { onChange(o); setOpen(false) }}
              style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 17,
                fontWeight: o === value ? 700 : 500, color: o === value ? 'var(--primary)' : 'var(--text)',
                background: o === value ? 'var(--primary-soft)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {o}{o === value && <Icon name="check" size={20} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const SegRadio = ({ value, onChange, options, error }: {
  value: string; onChange: (v: string) => void; options: string[]; error?: string | null
}) => (
  <div style={{ display: 'flex', gap: 10 }}>
    {options.map(o => {
      const on = o === value
      return (
        <button key={o} type="button" onClick={() => onChange(o)}
          style={{ flex: '1 1 0', minHeight: 'var(--tap)', borderRadius: 'var(--r-sm)',
            cursor: 'pointer', fontSize: 17, fontWeight: on ? 700 : 600,
            fontFamily: 'var(--font-ui)', transition: 'all .15s',
            border: `1.5px solid ${on ? 'var(--primary)' : error ? 'var(--danger)' : 'var(--line-strong)'}`,
            background: on ? 'var(--primary)' : 'var(--surface)',
            color: on ? 'var(--on-primary)' : 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {on && <Icon name="check" size={19} />}{o}
        </button>
      )
    })}
  </div>
)

export const Stepper = ({ id, value, onChange, min = 0, max = 120, unit }: {
  id?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string
}) => {
  const [raw, setRaw] = useState(String(value))
  useEffect(() => { setRaw(String(value)) }, [value])

  const commit = (s: string) => {
    const n = parseInt(s, 10)
    const clamped = isNaN(n) ? min : Math.max(min, Math.min(max, n))
    onChange(clamped)
    setRaw(String(clamped))
  }

  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta))
    onChange(next)
    setRaw(String(next))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" onClick={() => step(-1)} style={stepBtnStyle}>−</button>
      <div style={{ ...inputBase, width: 130, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 800, fontSize: 24, minHeight: 'var(--tap)' }}>
        <input id={id} type="number" value={raw} min={min} max={max}
          onChange={e => setRaw(e.target.value)}
          onBlur={e => commit(e.target.value)}
          style={{ width: 64, border: 'none', outline: 'none', textAlign: 'center', fontSize: 24, fontWeight: 800, background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-ui)' }} />
        {unit && <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      <button type="button" onClick={() => step(1)} style={stepBtnStyle}>+</button>
    </div>
  )
}
const stepBtnStyle: React.CSSProperties = {
  width: 'var(--tap)', height: 'var(--tap)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
  border: '1.5px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--primary)',
  display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 24,
}

export const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    style={{ width: 62, height: 36, borderRadius: 20, border: 'none', cursor: 'pointer',
      background: checked ? 'var(--primary)' : 'var(--line-strong)', position: 'relative',
      transition: 'background .18s', flexShrink: 0 }}>
    <span style={{ position: 'absolute', top: 4, left: checked ? 30 : 4, width: 28, height: 28,
      borderRadius: '50%', background: '#fff', transition: 'left .18s', boxShadow: '0 2px 6px rgba(0,0,0,.25)' }} />
  </button>
)

/* ─── CHART ─────────────────────────────────────────────────────────── */
export const LineChart = ({ data, height = 220 }: {
  data: { label: string; v: number }[]; height?: number
}) => {
  if (data.length < 2) return null
  const w = 700, h = height, pad = { l: 32, r: 32, t: 22, b: 30 }
  const xs = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / (data.length - 1)
  const ys = (v: number) => pad.t + (1 - v / 100) * (h - pad.t - pad.b)
  const pts = data.map((d, i) => [xs(i), ys(d.v)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = line + ` L${xs(data.length - 1)} ${h - pad.b} L${pad.l} ${h - pad.b} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" aria-label="Score trend" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="cbArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart)" stopOpacity=".22" />
          <stop offset="100%" stopColor="var(--chart)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map(g => (
        <line key={g} x1={pad.l} x2={w - pad.r} y1={ys(g)} y2={ys(g)}
          stroke="var(--line)" strokeWidth="1" strokeDasharray="2 6" />
      ))}
      <path d={area} fill="url(#cbArea)" />
      <path d={line} fill="none" stroke="var(--chart)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 7 : 4.5}
            fill="var(--surface)" stroke="var(--chart)" strokeWidth="3" />
          <text x={p[0]} y={h - 9} textAnchor="middle" fontSize="13" fontWeight="600"
            fill="var(--text-faint)" fontFamily="var(--font-ui)">{data[i].label}</text>
        </g>
      ))}
    </svg>
  )
}

/* ─── STATES ─────────────────────────────────────────────────────────── */
export const Spinner = ({ size = 30, color = 'var(--primary)' }: { size?: number; color?: string }) => (
  <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%',
    border: `${Math.max(2.5, size / 9)}px solid color-mix(in srgb, ${color} 22%, transparent)`,
    borderTopColor: color, animation: 'cbSpin .7s linear infinite' }} />
)

export const Skeleton = ({ w = '100%', h = 16, r = 8 }: { w?: number | string; h?: number; r?: number }) => (
  <span style={{ display: 'block', width: w, height: h, borderRadius: r,
    background: 'linear-gradient(100deg, var(--surface-2) 30%, var(--line) 50%, var(--surface-2) 70%)',
    backgroundSize: '200% 100%', animation: 'cbShimmer 1.4s ease-in-out infinite' }} />
)

export const SkeletonRow = () => (
  <Card pad={18} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <Skeleton w={56} h={56} r={28} />
    <div style={{ flex: 1 }}>
      <Skeleton w="55%" h={18} />
      <div style={{ height: 10 }} />
      <Skeleton w="38%" h={13} />
    </div>
    <Skeleton w={74} h={28} r={14} />
  </Card>
)

export const LoadingOverlay = ({ title = 'Loading…', sub }: { title?: string; sub?: string }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 22, background: 'var(--bg)', padding: 40, textAlign: 'center', minHeight: '60vh' }}>
    <Spinner size={52} />
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
      {sub && <div style={{ fontSize: 16, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  </div>
)

export const EmptyState = ({ icon = 'list', title, sub, action }: {
  icon?: string; title: string; sub?: string; action?: React.ReactNode
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '60px 30px', gap: 8 }}>
    <span style={{ width: 84, height: 84, borderRadius: '50%', display: 'grid', placeItems: 'center',
      background: 'var(--surface-2)', color: 'var(--text-faint)', marginBottom: 10 }}>
      <Icon name={icon} size={40} /></span>
    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
    {sub && <div style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 340, lineHeight: 1.45 }}>{sub}</div>}
    {action && <div style={{ marginTop: 18 }}>{action}</div>}
  </div>
)

/* ─── SEARCH ─────────────────────────────────────────────────────────── */
export const SearchBar = ({ value, onChange, placeholder = 'Search…' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) => {
  const [foc, setFoc] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 16, color: 'var(--text-muted)', pointerEvents: 'none', display: 'grid', placeItems: 'center' }}>
        <Icon name="search" size={22} /></span>
      <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ ...inputBase, paddingLeft: 50, paddingRight: value ? 50 : 18,
          borderColor: foc ? 'var(--ring)' : 'var(--line-strong)',
          boxShadow: foc ? '0 0 0 4px color-mix(in srgb, var(--ring) 18%, transparent)' : 'none' }} />
      {value && (
        <button onClick={() => onChange('')} style={{ position: 'absolute', right: 12, width: 34, height: 34,
          borderRadius: 10, border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center',
          background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
          <Icon name="x" size={18} /></button>
      )}
    </div>
  )
}

/* ─── NAVIGATION ─────────────────────────────────────────────────────── */
export const TopBar = ({ title, brand, left, right, sub }: {
  title?: string; brand?: boolean; left?: React.ReactNode; right?: React.ReactNode; sub?: string
}) => (
  <header style={{ flexShrink: 0, minHeight: 86, padding: '18px var(--pad)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
    background: 'var(--surface)', borderBottom: '1px solid var(--line)', zIndex: 20, position: 'sticky', top: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      {left}
      {brand ? (
        <Image src="/big_logo.png" alt="Revaive" width={124} height={40} style={{ display: 'block' }} />
      ) : (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {sub && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
  </header>
)

export const IconButton = ({ name, label, onClick, badge }: {
  name: string; label: string; onClick?: () => void; badge?: boolean
}) => (
  <button onClick={onClick} aria-label={label}
    style={{ width: 50, height: 50, borderRadius: 14, border: '1px solid var(--line)',
      background: 'var(--surface)', color: 'var(--text)', display: 'grid', placeItems: 'center',
      cursor: 'pointer', position: 'relative' }}>
    <Icon name={name} size={24} />
    {badge && <span style={{ position: 'absolute', top: 9, right: 9, width: 9, height: 9,
      borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 0 2px var(--surface)' }} />}
  </button>
)

export const BottomNav = ({ items }: { items: { href: string; label: string; icon: string }[] }) => {
  const pathname = usePathname()
  const router = useRouter()
  return (
    <nav style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'stretch',
      padding: '10px 18px 20px', background: 'var(--surface)', borderTop: '1px solid var(--line)',
      zIndex: 20, position: 'sticky', bottom: 0 }}>
      {items.map(it => {
        const active = pathname === it.href
        return (
          <button key={it.href} onClick={() => router.push(it.href)} aria-current={active ? 'page' : undefined}
            style={{ flex: 1, maxWidth: 150, border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px',
              color: active ? 'var(--primary)' : 'var(--text-faint)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 64, height: 36, borderRadius: 20,
              background: active ? 'var(--primary-soft)' : 'transparent' }}>
              <Icon name={it.icon} size={25} stroke={active ? 2.4 : 2} />
            </span>
            <span style={{ fontSize: 13, fontWeight: active ? 700 : 600 }}>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

/* ─── SCREEN SHELL ───────────────────────────────────────────────────── */
export const Screen = ({ topBar, bottomNav, children, bg, pad = true }: {
  topBar?: React.ReactNode; bottomNav?: React.ReactNode
  children: React.ReactNode; bg?: string; pad?: boolean
}) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: bg || 'var(--bg)',
    maxWidth: 900, width: '100%', margin: '0 auto' }}>
    {topBar}
    <div style={{ flex: 1, padding: pad ? '32px var(--pad) 48px' : 0 }}>
      {children}
    </div>
    {bottomNav}
  </div>
)

/* ─── SETTINGS HELPERS ───────────────────────────────────────────────── */
export const Divider = () => <div style={{ height: 1, background: 'var(--line)', margin: '0 16px' }} />

export const SettingsRow = ({ icon, title, sub, children }: {
  icon: string; title: string; sub?: string; children?: React.ReactNode
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}>
    <span style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: 'grid',
      placeItems: 'center', background: 'var(--surface-2)', color: 'var(--primary)' }}>
      <Icon name={icon} size={23} /></span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {sub && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
    </div>
    {children}
  </div>
)

export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
    color: 'var(--text-faint)', margin: '4px 4px 10px' }}>
    {children}
  </div>
)

/* ─── KEBAB MENU ─────────────────────────────────────────────────────── */
export const KebabMenu = ({ items }: {
  items: { label: string; icon?: string; danger?: boolean; onClick: () => void }[]
}) => {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      const inBtn = btnRef.current?.closest('[data-kebab]')?.contains(e.target as Node)
      const inDrop = dropRef.current?.contains(e.target as Node)
      if (!inBtn && !inDrop) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setOpen(o => !o)
  }
  return (
    <div data-kebab="" style={{ position: 'relative' }}>
      <button ref={btnRef} onClick={handleOpen} aria-label="More options"
        style={{ width: 44, height: 44, borderRadius: 12,
          border: open ? '1.5px solid var(--ring)' : '1px solid var(--line)',
          background: open ? 'var(--primary-soft)' : 'var(--surface)',
          color: open ? 'var(--primary)' : 'var(--text-muted)',
          display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <Icon name="dotsV" size={22} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={dropRef} style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 300,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-pop)', minWidth: 190, overflow: 'hidden' }}>
          {items.map((it, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); it.onClick(); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                border: 'none', borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontSize: 16, fontWeight: 600, color: it.danger ? 'var(--danger)' : 'var(--text)' }}>
              {it.icon && <Icon name={it.icon} size={20} />}
              {it.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

/* ─── CONFIRM DIALOG ─────────────────────────────────────────────────── */
export const ConfirmDialog = ({ open, title, body, confirmLabel = 'Delete', loading, onConfirm, onCancel }: {
  open: boolean; title: string; body: string
  confirmLabel?: string; loading?: boolean; onConfirm: () => void; onCancel: () => void
}) => {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.45)' }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)',
        padding: 28, maxWidth: 380, width: '100%', boxShadow: 'var(--shadow-pop)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{title}</div>
        <p style={{ fontSize: 15.5, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>{body}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="outline" size="md" full onClick={onCancel}>Cancel</Button>
          <Button size="md" full danger loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

/* ─── FILTER CHIPS ───────────────────────────────────────────────────── */
export const FilterChips = ({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { label: string; count?: number }[]
}) => (
  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
    {options.map(o => {
      const active = value === o.label
      return (
        <button key={o.label} onClick={() => onChange(o.label)}
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 999, cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: active ? 700 : 600,
            border: active ? '1.5px solid var(--primary)' : '1px solid var(--line-strong)',
            background: active ? 'var(--primary)' : 'var(--surface)',
            color: active ? 'var(--on-primary)' : 'var(--text-muted)',
            transition: 'all .15s' }}>
          {o.label}
          {o.count !== undefined && (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 20, height: 20, borderRadius: 10, fontSize: 13, fontWeight: 800, padding: '0 5px',
              background: active ? 'rgba(255,255,255,0.22)' : 'var(--surface-2)',
              color: active ? '#fff' : 'var(--text-muted)' }}>
              {o.count}
            </span>
          )}
        </button>
      )
    })}
  </div>
)

/* ─── RISK HELPERS ───────────────────────────────────────────────────── */
export const toneVar = (t: string) =>
  t === 'good' ? 'var(--good)' : t === 'warn' ? 'var(--warn)' : 'var(--danger)'

export const riskTone = (label: string): 'good' | 'warn' | 'danger' =>
  label === 'low' ? 'good' : label === 'medium' ? 'warn' : 'danger'

export const initials = (n: string) =>
  (n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
