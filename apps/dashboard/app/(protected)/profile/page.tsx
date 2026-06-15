'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Screen, TopBar, BottomNav, Card, Button, Toggle, Pill,
  SectionLabel, SettingsRow, Divider, Icon,
} from '@/components/ui'

const PATIENT_NAV = [
  { href: '/session', label: 'Home', icon: 'home' },
  { href: '/progress', label: 'Progress', icon: 'chart' },
  { href: '/profile', label: 'Profile', icon: 'user' },
]

export default function ProfilePage() {
  const [reminders, setReminders] = useState(true)
  const router = useRouter()

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Screen
      bg="#f2eee2"
      topBar={<TopBar title="Profile" />}
      bottomNav={<BottomNav items={PATIENT_NAV} />}>

      <Card style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
        <span style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0, display: 'grid',
          placeItems: 'center', background: 'var(--primary)', color: 'var(--on-primary)',
          fontSize: 28, fontWeight: 800 }}>
          <Icon name="user" size={34} />
        </span>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>My Profile</div>
          <div style={{ fontSize: 15.5, color: 'var(--text-muted)' }}>Recovering</div>
          <div style={{ marginTop: 8 }}>
            <Pill tone="primary"><Icon name="heart" size={14} />Care team</Pill>
          </div>
        </div>
      </Card>

      <SectionLabel>Account</SectionLabel>
      <Card pad={6} style={{ marginBottom: 20 }}>
        <SettingsRow icon="bell" title="Daily reminders" sub="Session reminder at 09:00">
          <Toggle checked={reminders} onChange={setReminders} />
        </SettingsRow>
        <Divider />
        <SettingsRow icon="settings" title="Preferences" sub="Language, sound, privacy">
          <Icon name="chevRight" size={22} style={{ color: 'var(--text-faint)' }} />
        </SettingsRow>
      </Card>

      <SectionLabel>Support</SectionLabel>
      <Card pad={6} style={{ marginBottom: 24 }}>
        <SettingsRow icon="info" title="About Revaive" sub="Version 1.0 · Cognitive companion">
          <Icon name="chevRight" size={22} style={{ color: 'var(--text-faint)' }} />
        </SettingsRow>
      </Card>

      <Button full variant="outline" danger icon="logout" onClick={signOut}>Sign Out</Button>
    </Screen>
  )
}
