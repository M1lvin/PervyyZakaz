import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useReducedMotion } from 'motion/react'
import { skills, type MyOrder, type Skill } from '../data/orders'
import Card from './ui/Card'
import Button from './ui/Button'
import Input from './ui/Input'
import { formatSom } from '../lib/format'

export interface UserProfile {
  name: string
  contact: string
  skills: Skill[]
  avatarUrl: string
}

interface ProfileProps {
  profile: UserProfile
  orders: MyOrder[]
  userId: string
  onOpenSettings: () => void
  onSave: (profile: UserProfile) => Promise<boolean>
  onUploadAvatar: (image: Blob) => Promise<string>
  onSignOut: () => void
  animateStamp: boolean
}

const maxAvatarSize = 2 * 1024 * 1024
const acceptedAvatarTypes = ['image/jpeg', 'image/png', 'image/webp']

async function prepareAvatar(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = imageUrl
    try {
      await image.decode()
    } catch {
      throw new Error('Не удалось прочитать изображение. Выберите другой файл.')
    }

    const cropSize = Math.min(image.naturalWidth, image.naturalHeight)
    const cropX = (image.naturalWidth - cropSize) / 2
    const cropY = (image.naturalHeight - cropSize) / 2
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Не удалось подготовить изображение. Выберите другой файл.')

    context.drawImage(image, cropX, cropY, cropSize, cropSize, 0, 0, 512, 512)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(
          new Error('Не удалось подготовить изображение. Выберите другой файл.'),
        ),
        'image/webp',
        0.9,
      )
    })
    if (blob.type !== 'image/webp') {
      throw new Error('Ваш браузер не поддерживает сохранение изображения в WebP.')
    }
    return blob
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

export function FirstOrderStamp({
  earned,
  small = false,
  animate = false,
}: {
  earned: boolean
  small?: boolean
  animate?: boolean
}) {
  return (
    <div
      aria-label={earned ? 'Печать «Первый заказ» получена' : 'Печать ещё не получена'}
      className={`profile-stamp-shadow flex shrink-0 flex-col items-center justify-center rounded-full border leading-none ${
        small ? 'h-[54px] w-[54px]' : 'h-[76px] w-[76px]'
      } ${
        earned
          ? 'border-accent text-accent'
          : 'border-default text-secondary'
      } ${animate && earned ? 'stamp-earned' : ''}`}
    >
      <span className="text-xs font-bold tracking-[0.08em]">
        ПЕРВЫЙ
      </span>
      {!small && <span className="mt-0.5 text-xs">заказ</span>}
    </div>
  )
}

export default function Profile({
  profile,
  orders,
  userId,
  onOpenSettings,
  onSave,
  onUploadAvatar,
  onSignOut,
  animateStamp,
}: ProfileProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(profile.name)
  const [contact, setContact] = useState(profile.contact)
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>(profile.skills)
  const [nameError, setNameError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(profile.name)
    setContact(profile.contact)
    setSelectedSkills(profile.skills)
  }, [profile.name, profile.contact, profile.skills])

  const paidOrders = orders.filter(
    (order) => order.takenBy === userId && order.status === 'paid',
  )
  const totalEarned = paidOrders.reduce(
    (total, order) => total + (order.responsePrice ?? 0),
    0,
  )
  const [displayEarned, setDisplayEarned] = useState(totalEarned)
  const previousEarned = useRef(totalEarned)
  const reducedMotion = useReducedMotion()
  const earned = paidOrders.length > 0

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!acceptedAvatarTypes.includes(file.type)) {
      setAvatarError('Выберите изображение в формате JPG, PNG или WebP.')
      return
    }
    if (file.size > maxAvatarSize) {
      setAvatarError('Размер изображения не должен превышать 2 МБ.')
      return
    }

    setAvatarError('')
    setAvatarUploading(true)
    try {
      const image = await prepareAvatar(file)
      await onUploadAvatar(image)
    } catch (error) {
      setAvatarError(
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить фотографию. Попробуйте ещё раз.',
      )
    } finally {
      setAvatarUploading(false)
    }
  }

  useEffect(() => {
    if (previousEarned.current === totalEarned) return
    const from = previousEarned.current
    previousEarned.current = totalEarned
    if (reducedMotion) {
      setDisplayEarned(totalEarned)
      return
    }

    const startedAt = performance.now()
    let frame = 0
    const updateCount = (now: number) => {
      const progress = Math.min((now - startedAt) / 700, 1)
      const eased = 1 - (1 - progress) ** 3
      setDisplayEarned(Math.round(from + (totalEarned - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(updateCount)
    }
    frame = requestAnimationFrame(updateCount)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion, totalEarned])

  async function submitProfile(event: FormEvent<HTMLElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setNameError('Имя должно быть от 2 символов')
      setSaved(false)
      return
    }

    const nextProfile = {
      name: trimmedName,
      contact: contact.trim(),
      skills: selectedSkills,
      avatarUrl: profile.avatarUrl,
    }
    setNameError('')
    setSaving(true)
    try {
      setSaved(await onSave(nextProfile))
    } finally {
      setSaving(false)
    }
  }

  function toggleSkill(skill: Skill) {
    setSelectedSkills((current) =>
      current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill],
    )
    setSaved(false)
  }

  return (
    <section aria-label="Профиль">
      <Card as="form" className="mb-3 p-4" noValidate onSubmit={submitProfile}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="profile-avatar"
              aria-label="Загрузить фотографию профиля"
              aria-busy={avatarUploading || undefined}
              disabled={avatarUploading}
              onClick={() => avatarInputRef.current?.click()}
            >
              {profile.avatarUrl ? (
                <img
                  key={profile.avatarUrl}
                  src={profile.avatarUrl}
                  alt=""
                  className="profile-avatar-image"
                />
              ) : (
                <span aria-hidden="true" className="profile-avatar-initials">
                  {name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
                    .map((part) => Array.from(part)[0])
                    .join('')
                    .toLocaleUpperCase('ru-RU') || 'П'}
                </span>
              )}
              {avatarUploading && (
                <span className="profile-avatar-overlay" role="status" aria-label="Загружаем фотографию">
                  <span className="profile-avatar-spinner" aria-hidden="true" />
                </span>
              )}
            </Button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              hidden
            />
            {avatarError && (
              <p role="alert" className="text-error text-center text-xs">
                {avatarError}
              </p>
            )}
          </div>
          <div>
            <p className="text-base font-semibold">{name.trim() || 'Профиль'}</p>
            <p className="mt-1 text-sm text-secondary">Нажмите на фото, чтобы изменить</p>
          </div>
        </div>

        <Input
          id="profile-name"
          label="Имя"
          type="text"
          maxLength={40}
          value={name}
          error={nameError}
          placeholder="Как вас называть"
          onChange={(event) => {
            setName(event.target.value)
            setNameError('')
            setSaved(false)
          }}
          className="mb-3"
        />

        <Input
          id="profile-contact"
          label="Контакт для заказчика"
          type="text"
          maxLength={80}
          value={contact}
          placeholder="Telegram или телефон"
          onChange={(event) => {
            setContact(event.target.value)
            setSaved(false)
          }}
          className="mb-3"
        />

        <fieldset className="theme-settings mb-3 rounded-[10px] border p-3">
          <legend className="px-1 text-sm">Навыки</legend>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => {
              const checked = selectedSkills.includes(skill)
              return (
                <label
                  key={skill}
                  className={`theme-option inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm ${
                    checked ? 'is-selected' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    value={skill}
                    checked={checked}
                    onChange={() => {
                      toggleSkill(skill)
                      setSaved(false)
                    }}
                    className="control-accent h-4 w-4"
                  />
                  <span>{skill}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <Button
          type="submit"
          disabled={saving || avatarUploading}
          variant="primary"
          loading={saving}
          loadingLabel="Сохраняем профиль"
        >
          Сохранить
        </Button>
        {saved && (
          <p role="status" className="text-secondary mt-2 text-sm">
            Профиль сохранён
          </p>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <FirstOrderStamp earned={earned} animate={animateStamp} />
          <div>
            <p className="total-earned money">
              {formatSom(displayEarned)}
            </p>
            <p className="mt-1 text-[13px] text-secondary">
              {paidOrders.length} оплаченных заказов
            </p>
          </div>
        </div>
        <p className="mt-3.5 text-[13px] text-secondary">
          {earned
            ? 'Печать «Первый заказ» получена. Она будет стоять на всех ваших работах.'
            : 'Печать появится после первого оплаченного заказа'}
        </p>
      </Card>
      <Button
        type="button"
        variant="secondary"
        onClick={onOpenSettings}
        className="mt-3 w-full text-sm"
      >
        Настройки
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={onSignOut}
        className="mt-3 w-full text-sm"
      >
        Выйти
      </Button>
    </section>
  )
}
