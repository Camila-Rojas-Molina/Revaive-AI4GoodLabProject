'use server'

import { createAdminClient } from '@/lib/supabase-admin'

function generatePin(): string {
  // 4-digit numeric PIN, zero-padded so e.g. 0042 stays 4 chars
  return String(Math.floor(Math.random() * 9000) + 1000)
}

export async function createPatientAccount(
  patientId: string,
  fullName: string,
): Promise<{ pin?: string; error?: string }> {
  const supabase = createAdminClient()
  const pin = generatePin()
  const shortId = patientId.slice(0, 8)
  const email = `${shortId}@revaive.com`

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    user_metadata: { role: 'patient', full_name: fullName, pin },
  })

  if (error) return { error: error.message }

  // The DB trigger auto-creates the profiles row; upsert here as a safety net
  await supabase
    .from('profiles')
    .upsert({ id: data.user.id, role: 'patient', full_name: fullName })

  // Link the clinical patient record to this auth account
  await supabase
    .from('patients')
    .update({ profile_id: data.user.id })
    .eq('id', patientId)

  return { pin }
}
