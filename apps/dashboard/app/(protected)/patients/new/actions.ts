'use server'

import { createAdminClient } from '@/lib/supabase-admin'

export async function createPatientAccount(
  email: string,
  fullName: string,
  patientId: string,
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Create user immediately (no confirmation email sent)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: 'patient', full_name: fullName },
  })

  if (error) return { error: error.message }

  // The trigger auto-creates the profiles row, but upsert here as a safety net
  await supabase
    .from('profiles')
    .upsert({ id: data.user.id, role: 'patient', full_name: fullName })

  // Link the clinical patient record to this login account
  await supabase
    .from('patients')
    .update({ profile_id: data.user.id })
    .eq('id', patientId)

  return {}
}
