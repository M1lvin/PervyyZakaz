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
  onSave: (profile: UserProfile) => Promise<boolean>
  onSignOut: () => void
}

export function FirstOrderStamp({ earned, small = false }: { earned: boolean; small?: boolean }) {
  return (
    <div
      aria-label={earned ? 'Печать «Первый заказ» получена' : 'Печать ещё не получена'}
      className={`flex shrink-0 rotate-[-10deg] flex-col items-center justify-center rounded-full border-2 leading-none shadow-[inset_0_0_0_4px_white,inset_0_0_0_5px_currentColor] ${
        small ? 'h-[54px] w-[54px]' : 'h-[76px] w-[76px]'
      } ${
        earned
          ? 'border-[#1f6f5c] text-[#1f6f5c]'
          : 'border-[#e3e0d7] text-[#6f6c64]'
      }`}
    >
      <span className={`font-bold tracking-[0.08em] ${small ? 'text-[10px]' : 'text-[13px]'}`}>
        ПЕРВЫЙ
      </span>
      {!small && <small className="mt-0.5 text-[11px]">заказ</small>}
    </div>
  )
}

export default function Profile({ profile, orders, userId, onSave, onSignOut }: ProfileProps) {
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
        className="mb-3 rounded-xl border border-[#e3e0d7] bg-white p-4"
        noValidate
        onSubmit={submitProfile}
      >
        <label htmlFor="profile-name" className="mb-3 block text-sm text-[#6f6c64]">
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
            className="mt-1.5 min-h-11 w-full rounded-[10px] border border-[#e3e0d7] bg-white px-3 py-2.5 text-[15px] text-[#1d1c19]"
          />
          {nameError && (
            <span id="profile-name-error" className="mt-1 block text-sm text-[#a23b2c]">
              {nameError}
            </span>
          )}
        </label>

        <label htmlFor="profile-contact" className="mb-3 block text-sm text-[#6f6c64]">
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
            className="mt-1.5 min-h-11 w-full rounded-[10px] border border-[#e3e0d7] bg-white px-3 py-2.5 text-[15px] text-[#1d1c19]"
          />
        </label>

        <fieldset className="mb-3 rounded-[10px] border border-[#e3e0d7] p-3">
          <legend className="px-1 text-sm text-[#6f6c64]">Навыки</legend>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => {
              const checked = selectedSkills.includes(skill)
              return (
                <label
                  key={skill}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-[#1d1c19] ${
                    checked
                      ? 'border-[#1f6f5c] bg-[#e4f0eb]'
                      : 'border-[#e3e0d7] bg-white'
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
                    className="h-4 w-4 accent-[#1f6f5c]"
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
          className="min-h-11 rounded-[10px] border border-[#1f6f5c] bg-[#1f6f5c] px-4 py-2.5 text-white"
          style={{ backgroundColor: '#1F6F5C', color: '#FFFFFF' }}
        >
          Сохранить
        </button>
        {saved && (
          <p role="status" className="mt-2 text-sm text-[#1f6f5c]">
            Профиль сохранён
          </p>
        )}
      </form>

      <div className="rounded-xl border border-[#e3e0d7] bg-white p-4">
        <div className="flex items-center gap-4">
          <FirstOrderStamp earned={earned} />
          <div>
            <p className="m-0 text-[22px] font-semibold">
              {totalEarned.toLocaleString('ru-RU')} сом
            </p>
            <p className="mt-1 text-[13px] text-[#6f6c64]">
              {paidOrders.length} оплаченных заказов
            </p>
          </div>
        </div>
        <p className="mt-3.5 text-[13px] text-[#6f6c64]">
          {earned
            ? 'Печать «Первый заказ» получена. Она будет стоять на всех ваших работах.'
            : 'Печать появится после первого оплаченного заказа'}
        </p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-3 min-h-11 w-full rounded-[10px] border border-[#e3e0d7] bg-white px-4 py-2.5 text-sm text-[#1d1c19]"
      >
        Выйти
      </button>
    </section>
  )
}
