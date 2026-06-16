'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Screen, TopBar, BottomNav, Card, Icon, IconButton, EmptyState } from '@/components/ui'
import type { AlertItem } from './page'

const NURSE_NAV = [
  { href: '/dashboard', label: 'Patients', icon: 'list' },
  { href: '/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/settings', label: 'Profile', icon: 'user' },
]

const SWIPE_THRESHOLD = 80
const REFRESH_INTERVAL_MS = 60_000

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AlertsClient({ alerts: serverAlerts }: { alerts: AlertItem[] }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [swipeX, setSwipeX] = useState<Record<string, number>>({})
  const [pullY, setPullY] = useState(0)

  const swipeStart = useRef<Record<string, number>>({})
  const pullStart = useRef(0)
  const isPulling = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const visible = serverAlerts.filter(a => !dismissed.has(a.id))

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const t = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS)
    return () => clearInterval(t)
  }, [router])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 900)
  }, [router])

  // ── Dismiss ──────────────────────────────────────────────────────────
  const dismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
    setSwipeX(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const bulkDismiss = () => {
    setDismissed(prev => new Set([...prev, ...selected]))
    setSelected(new Set())
    setSelectMode(false)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
    })
  }

  const toggleSelectAll = () => {
    setSelected(selected.size === visible.length ? new Set() : new Set(visible.map(a => a.id)))
  }

  // ── Swipe to dismiss ─────────────────────────────────────────────────
  const onCardTouchStart = (id: string, e: React.TouchEvent) => {
    if (selectMode) return
    swipeStart.current[id] = e.touches[0].clientX
  }

  const onCardTouchMove = (id: string, e: React.TouchEvent) => {
    if (selectMode) return
    const dx = e.touches[0].clientX - (swipeStart.current[id] ?? 0)
    if (dx > 0) setSwipeX(prev => ({ ...prev, [id]: dx }))
  }

  const onCardTouchEnd = (id: string) => {
    if (selectMode) return
    const dx = swipeX[id] ?? 0
    if (dx > SWIPE_THRESHOLD) dismiss(id)
    else setSwipeX(prev => ({ ...prev, [id]: 0 }))
    delete swipeStart.current[id]
  }

  // ── Pull-to-refresh ──────────────────────────────────────────────────
  const onContainerTouchStart = (e: React.TouchEvent) => {
    if ((scrollRef.current?.scrollTop ?? 1) > 0) return
    pullStart.current = e.touches[0].clientY
    isPulling.current = true
  }

  const onContainerTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return
    const dy = e.touches[0].clientY - pullStart.current
    if (dy > 0) setPullY(Math.min(dy * 0.45, 64))
  }

  const onContainerTouchEnd = () => {
    if (pullY >= 48) handleRefresh()
    setPullY(0)
    isPulling.current = false
  }

  // ── Buttons ──────────────────────────────────────────────────────────
  const refreshBtn = (
    <button
      onClick={handleRefresh}
      aria-label="Refresh alerts"
      style={{
        width: 40, height: 40, borderRadius: 12, border: '1px solid var(--line)',
        background: 'var(--surface)', color: 'var(--text-muted)',
        display: 'grid', placeItems: 'center', cursor: 'pointer',
        transition: 'transform .6s ease',
        transform: isRefreshing ? 'rotate(360deg)' : 'none',
      }}
    >
      <Icon name="refresh" size={18} />
    </button>
  )

  const editBtn = visible.length > 0 ? (
    selectMode ? (
      <button onClick={() => { setSelectMode(false); setSelected(new Set()) }}
        style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 700,
          color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
        Done
      </button>
    ) : (
      <button onClick={() => setSelectMode(true)}
        style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 700,
          color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
        Select
      </button>
    )
  ) : null

  return (
    <Screen
      bg="var(--bg)"
      topBar={
        <TopBar
          title="Alerts"
          sub={visible.length > 0 ? `${visible.length} alert${visible.length !== 1 ? 's' : ''}` : 'Ward 4B'}
          left={<IconButton name="chevLeft" label="Back" onClick={() => router.back()} />}
          right={<>{refreshBtn}{editBtn}</>}
        />
      }
      bottomNav={<BottomNav items={NURSE_NAV} />}
    >
      {/* Pull-to-refresh indicator */}
      {pullY > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: pullY, overflow: 'hidden', color: 'var(--text-faint)', fontSize: 13,
        }}>
          <Icon name="refresh" size={18} style={{ opacity: Math.min(pullY / 48, 1) }} />
        </div>
      )}
      {isRefreshing && (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', marginBottom: 8 }}>
          Refreshing…
        </div>
      )}

      {/* Select mode controls */}
      {selectMode && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={toggleSelectAll}
            style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
              color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {selected.size === visible.length ? 'Deselect all' : 'Select all'}
          </button>
          <span style={{ fontSize: 14, color: 'var(--text-faint)' }}>{selected.size} selected</span>
        </div>
      )}

      <div
        ref={scrollRef}
        onTouchStart={onContainerTouchStart}
        onTouchMove={onContainerTouchMove}
        onTouchEnd={onContainerTouchEnd}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {visible.length === 0 ? (
          <EmptyState icon="checkCircle" title="No alerts" sub="All patients are within normal score ranges." />
        ) : (
          visible.map(alert => {
            const tx = swipeX[alert.id] ?? 0
            const isSelected = selected.has(alert.id)
            return (
              <div
                key={alert.id}
                style={{
                  transform: `translateX(${tx}px)`,
                  transition: tx === 0 ? 'transform .25s ease' : 'none',
                  opacity: tx > SWIPE_THRESHOLD * 0.8 ? 0.4 : 1,
                  position: 'relative',
                }}
                onTouchStart={e => onCardTouchStart(alert.id, e)}
                onTouchMove={e => onCardTouchMove(alert.id, e)}
                onTouchEnd={() => onCardTouchEnd(alert.id)}
              >
                {/* Swipe trash hint */}
                {tx > 10 && (
                  <div style={{
                    position: 'absolute', left: -40, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--danger)', opacity: Math.min(tx / SWIPE_THRESHOLD, 1),
                  }}>
                    <Icon name="trash" size={18} />
                  </div>
                )}

                <Card pad={20} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  borderLeft: '4px solid var(--danger)', position: 'relative',
                  outline: isSelected ? '2px solid var(--primary)' : 'none',
                  outlineOffset: 2,
                  cursor: 'pointer',
                }}
                  onClick={() => {
                    if (tx > 5) return
                    if (selectMode) { toggleSelect(alert.id); return }
                    router.push(`/patients/${alert.patientId}`)
                  }}
                >
                  {/* Checkbox in select mode */}
                  {selectMode ? (
                    <span style={{
                      width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 1,
                      display: 'grid', placeItems: 'center',
                      background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.8)',
                      border: isSelected ? '2px solid var(--primary)' : '2px solid var(--line-strong)',
                    }}>
                      {isSelected && <Icon name="check" size={13} style={{ color: 'var(--on-primary)' }} />}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }}>
                      <Icon name="alert" size={24} />
                    </span>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                      {alert.title}
                    </div>
                    <p style={{ margin: '0 0 5px', fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {alert.body}
                    </p>
                    <span style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>
                      {timeAgo(alert.createdAt)}
                    </span>
                  </div>

                  {/* X dismiss button */}
                  {!selectMode && (
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(alert.id) }}
                      aria-label="Dismiss"
                      style={{
                        width: 26, height: 26, borderRadius: 8, border: '1px solid var(--line)',
                        background: 'var(--surface-2)', color: 'var(--text-faint)',
                        display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <Icon name="x" size={13} />
                    </button>
                  )}
                </Card>
              </div>
            )
          })
        )}
      </div>

      {/* Bulk dismiss sticky bar */}
      {selectMode && selected.size > 0 && (
        <div style={{
          position: 'sticky', bottom: 80, zIndex: 30, margin: '16px 0 0',
          background: 'var(--danger)', borderRadius: 18, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          boxShadow: '0 8px 32px -8px rgba(127,29,29,.5)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {selected.size} alert{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button onClick={bulkDismiss} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 999,
            background: '#fff', color: 'var(--danger)',
            border: 'none', fontSize: 14, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}>
            <Icon name="trash" size={16} />
            Dismiss
          </button>
        </div>
      )}
    </Screen>
  )
}
