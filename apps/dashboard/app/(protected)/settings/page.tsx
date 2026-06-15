'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Screen, TopBar, BottomNav, Card, Button, Toggle,
  SectionLabel, SettingsRow, Divider, Icon, Pill, initials,
} from '@/components/ui'

const NURSE_NAV = [
  { href: '/dashboard', label: 'Patients', icon: 'list' },
  { href: '/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/settings', label: 'Profile', icon: 'user' },
]

export default function NurseProfilePage() {
  const [notif, setNotif] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      const displayName = profile?.full_name || user.email?.split('@')[0] || 'Nurse'
      setName(displayName)
    }
    load()
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const ini = initials(name)

  return (
    <Screen
      bg="#f2eee2"
      topBar={<TopBar title="Profile" />}
      bottomNav={<BottomNav items={NURSE_NAV} />}>

      {/* Account card */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 8 }}>
        <span style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0, display: 'grid',
          placeItems: 'center', background: 'var(--primary)', color: 'var(--on-primary)',
          fontSize: 26, fontWeight: 800 }}>{ini || <Icon name="user" size={32} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>{name}</div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 10 }}>
            Registered Nurse · Ward 4B
          </div>
          <Pill tone="primary">Clinician</Pill>
        </div>
      </Card>

      {/* Signed-in email */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <span style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: 'grid',
          placeItems: 'center', background: 'var(--surface-2)', color: 'var(--primary)' }}>
          <Icon name="mail" size={22} />
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>
            Signed in as
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {email || '—'}
          </div>
        </div>
      </Card>

      <SectionLabel>Preferences</SectionLabel>
      <Card pad={6} style={{ marginBottom: 20 }}>
        <SettingsRow icon="bell" title="Alert notifications" sub="High-risk flags & re-screen reminders">
          <Toggle checked={notif} onChange={setNotif} />
        </SettingsRow>
      </Card>

      <SectionLabel>Ward</SectionLabel>
      <Card pad={6} style={{ marginBottom: 24 }}>
        <SettingsRow icon="list" title="Ward 4B" sub="Post-surgical unit">
          <Icon name="chevRight" size={22} style={{ color: 'var(--text-faint)' }} />
        </SettingsRow>
        <Divider />
        <SettingsRow icon="info" title="About Revaive" sub="Version 1.0 · Clinical decision support">
          <Icon name="chevRight" size={22} style={{ color: 'var(--text-faint)' }} />
        </SettingsRow>
      </Card>

      <Button full variant="outline" danger icon="logout" onClick={signOut}>Sign Out</Button>
    </Screen>
  )
}
