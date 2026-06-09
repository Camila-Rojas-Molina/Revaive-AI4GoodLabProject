'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Screen, TopBar, BottomNav, Card, Button, Toggle,
  SectionLabel, SettingsRow, Divider, Icon,
} from '@/components/ui'

const NURSE_NAV = [
  { href: '/dashboard', label: 'Patients', icon: 'list' },
  { href: '/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
]

export default function SettingsPage() {
  const [notif, setNotif] = useState(true)
  const router = useRouter()

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Screen
      topBar={<TopBar title="Settings" />}
      bottomNav={<BottomNav items={NURSE_NAV} />}>

      <SectionLabel>Preferences</SectionLabel>
      <Card pad={6} style={{ marginBottom: 20 }}>
        <SettingsRow icon="bell" title="Alert notifications" sub="High-risk flags & re-screen reminders">
          <Toggle checked={notif} onChange={setNotif} />
        </SettingsRow>
      </Card>

      <SectionLabel>Ward</SectionLabel>
      <Card pad={6} style={{ marginBottom: 20 }}>
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
