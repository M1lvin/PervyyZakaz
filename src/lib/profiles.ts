import type { SupabaseClient } from '@supabase/supabase-js'
import type { Skill } from '../data/orders'
import type { UserProfile } from '../components/Profile'

interface ProfileRow {
  id: string
  name: string
  contact: string
  skills: Skill[]
  avatar_url: string | null
}

export async function loadProfile(
  client: SupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await client
    .from('profiles')
    .select('id, name, contact, skills, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return { name: '', contact: '', skills: [], avatarUrl: '' }

  const profile = data as ProfileRow
  return {
    name: profile.name,
    contact: profile.contact,
    skills: profile.skills,
    avatarUrl: profile.avatar_url ?? '',
  }
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
      avatar_url: profile.avatarUrl,
    },
    { onConflict: 'id' },
  )

  if (error) throw error
}

export async function uploadProfileAvatar(
  client: SupabaseClient,
  userId: string,
  image: Blob,
): Promise<string> {
  const path = `${userId}/avatar.webp`
  const { error: uploadError } = await client.storage
    .from('avatars')
    .upload(path, image, { contentType: 'image/webp', upsert: true })

  if (uploadError) throw uploadError

  const { data } = client.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`
  const { error: profileError } = await client
    .from('profiles')
    .upsert({ id: userId, avatar_url: avatarUrl }, { onConflict: 'id' })

  if (profileError) throw profileError
  return avatarUrl
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
