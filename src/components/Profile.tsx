import { useEffect, useState, type FormEvent } from 'react'
import { skills, type MyOrder, type Skill } from '../data/orders'
import Card from './ui/Card'
import Button from './ui/Button'
import Input from './ui/Input'

export interface UserProfile {
  name: string
  contact: string
  skills: Skill[]
}

interface ProfileProps {
  profile: UserProfile
  orders: MyOrder[]
  userId: string
  onOpenSettings: () => void
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
  onOpenSettings,
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

  async function submitProfile(event: FormEvent<HTMLElement>) {
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
      <Card as="form" className="mb-3 p-4" noValidate onSubmit={submitProfile}>
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
          disabled={saving}
          variant="primary"
        >
          Сохранить
        </Button>
        {saved && (
          <p role="status" className="text-accent mt-2 text-sm">
            Профиль сохранён
          </p>
        )}
      </Card>

      <Card className="p-4">
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
