'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export async function publishBatteryModel(id: number) {
  await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('battery_models')
    .update({ is_published: true })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/batteries')
}

export async function unpublishBatteryModel(id: number) {
  await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('battery_models')
    .update({ is_published: false })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/batteries')
}

export async function rejectBatteryModel(id: number) {
  await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('battery_models')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/batteries')
}
