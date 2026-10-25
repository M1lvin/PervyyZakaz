import type { SupabaseClient } from '@supabase/supabase-js'
import type { Skill } from '../data/orders'
import type { UserProfile } from '../components/Profile'

interface ProfileRow {
  id: string
  name: string
  contact: string
  skills: Skill[]
}

export async function loadProfile(
  client: SupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await client
    .from('profiles')
    .select('id, name, contact, skills')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return { name: '', contact: '', skills: [] }

  const profile = data as ProfileRow
  return { name: profile.name, contact: profile.contact, skills: profile.skills }
}

export async function saveProfile(
  client: SupabaseClient,
  userId: string,
  profile: UserProfile,
): Promise<void> {
  const { error } = await client.from('profiles').upsert(
    {
      id: userId,
      name: profile.name,
      contact: profile.contact,
      skills: profile.skills,
    },
    { onConflict: 'id' },
  )

  if (error) throw error
}

export function profileErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const details = error as { code?: unknown; status?: unknown; message?: unknown }
    const code = typeof details.code === 'string' ? details.code : ''
    const status = details.status
    const message = typeof details.message === 'string' ? details.message.toLowerCase() : ''

    if (
      code === '42501' ||
      status === 401 ||
      status === 403 ||
      /permission|row-level security|not authorized|forbidden/.test(message)
    ) {
      return 'Недостаточно прав для доступа к профилю.'
    }
    if (/fetch|network|failed to connect|load failed/.test(message)) {
      return 'Не удалось связаться с сервером. Проверьте подключение к интернету.'
    }
  }

  return 'Не удалось загрузить или сохранить профиль. Попробуйте ещё раз.'
}
