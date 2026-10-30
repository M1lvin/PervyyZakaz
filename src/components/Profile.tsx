import { useEffect, useRef, useState, type FormEvent } from 'react'
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
}

interface ProfileProps {
  profile: UserProfile
  orders: MyOrder[]
  userId: string
  onOpenSettings: () => void
  onSave: (profile: UserProfile) => Promise<boolean>
  onSignOut: () => void
  animateStamp: boolean
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
  onSignOut,
  animateStamp,
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
  const [displayEarned, setDisplayEarned] = useState(totalEarned)
  const previousEarned = useRef(totalEarned)
  const reducedMotion = useReducedMotion()
  const earned = paidOrders.length > 0

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
