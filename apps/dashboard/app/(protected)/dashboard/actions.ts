'use server'

import { createAdminClient } from '@/lib/supabase-admin'

/** Returns a map of { profile_id → pin } for the given profile IDs. */
export async function getPatientPins(profileIds: string[]): Promise<Record<string, string>> {
  if (profileIds.length === 0) return {}
  const supabase = createAdminClient()
  const pins: Record<string, string> = {}
  await Promise.all(
    profileIds.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id)
      const pin = data?.user?.user_metadata?.pin
      if (pin) pins[id] = String(pin)
    }),
  )
  return pins
}
