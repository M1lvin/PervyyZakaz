import { useEffect, useState, type FormEvent } from 'react'
import { skills, type MyOrder, type Skill } from '../data/orders'

export interface UserProfile {
  name: string
  contact: string
  skills: Skill[]
}

interface ProfileProps {
  profile: UserProfile
  orders: MyOrder[]
  userId: string
  theme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  onSave: (profile: UserProfile) => Promise<boolean>
  onSignOut: () => void
}

export function FirstOrderStamp({ earned, small = false }: { earned: boolean; small?: boolean }) {
  return (
    <div
      aria-label={earned ? 'Печать «Первый заказ» получена' : 'Печать ещё не получена'}
      className={`profile-stamp-shadow flex shrink-0 rotate-[-10deg] flex-col items-center justify-center rounded-full border-2 leading-none ${
        small ? 'h-[54px] w-[54px]' : 'h-[76px] w-[76px]'
      } ${
        earned
          ? 'border-accent text-accent'
          : 'border-default text-secondary'
      }`}
    >
      <span className={`font-bold tracking-[0.08em] ${small ? 'text-[10px]' : 'text-[13px]'}`}>
        ПЕРВЫЙ
      </span>
      {!small && <small className="mt-0.5 text-[11px]">заказ</small>}
    </div>
  )
}

export default function Profile({
  profile,
  orders,
  userId,
  theme,
  onThemeChange,
  onSave,
  onSignOut,
}: ProfileProps) {
  const [name, setName] = useState(profile.name)
  const [contact, setContact] = useState(profile.contact)
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>(profile.skills)
  const [nameError, setNameError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(profile.name)
    setContact(profile.contact)
    setSelectedSkills(profile.skills)
  }, [profile])

  const paidOrders = orders.filter(
    (order) => order.takenBy === userId && order.status === 'paid',
  )
  const totalEarned = paidOrders.reduce(
    (total, order) => total + (order.responsePrice ?? 0),
    0,
  )
  const earned = paidOrders.length > 0

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setNameError('Имя должно быть от 2 символов')
      setSaved(false)
      return
    }

    const nextProfile = { name: trimmedName, contact: contact.trim(), skills: selectedSkills }
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
      <form
        className="card-background mb-3 rounded-xl border border-default p-4"
        noValidate
        onSubmit={submitProfile}
      >
        <label htmlFor="profile-name" className="mb-3 block text-sm text-secondary">
          Имя
          <input
            id="profile-name"
            type="text"
            maxLength={40}
            value={name}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'profile-name-error' : undefined}
            placeholder="Как вас называть"
            onChange={(event) => {
              setName(event.target.value)
              setNameError('')
              setSaved(false)
            }}
            className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
          />
          {nameError && (
            <span id="profile-name-error" className="text-error mt-1 block text-sm">
              {nameError}
            </span>
          )}
        </label>

        <label htmlFor="profile-contact" className="mb-3 block text-sm text-secondary">
          Контакт для заказчика
          <input
            id="profile-contact"
            type="text"
            maxLength={80}
            value={contact}
            placeholder="Telegram или телефон"
            onChange={(event) => {
              setContact(event.target.value)
              setSaved(false)
            }}
            className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
          />
        </label>

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

        <button
          type="submit"
          disabled={saving}
          className="button-primary min-h-11 rounded-[10px] px-4 py-2.5"
        >
          Сохранить
        </button>
        {saved && (
          <p role="status" className="text-accent mt-2 text-sm">
            Профиль сохранён
          </p>
        )}
      </form>

      <div className="card-background rounded-xl border border-default p-4">
        <div className="flex items-center gap-4">
          <FirstOrderStamp earned={earned} />
          <div>
            <p className="m-0 text-[22px] font-semibold">
              {totalEarned.toLocaleString('ru-RU')} сом
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
      </div>
      <fieldset className="theme-settings mt-3 rounded-xl border p-4">
        <legend className="px-1 text-sm">Настройки</legend>
        <div className="flex flex-col gap-2">
          {([
            ['light', 'Светлая'],
            ['dark', 'Тёмная'],
            ['system', 'Как в системе'],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => onThemeChange(value)}
                className="control-accent h-4 w-4"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={onSignOut}
        className="button-secondary mt-3 min-h-11 w-full rounded-[10px] px-4 py-2.5 text-sm"
      >
        Выйти
      </button>
    </section>
  )
}
