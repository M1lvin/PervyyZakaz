import { useState, type FormEvent } from 'react'
import { skills, type Order, type Skill } from '../data/orders'

interface PlaceOrderProps {
  onPublish: (order: Order) => Promise<boolean>
}

interface FormValues {
  business: string
  title: string
  description: string
  budget: string
  days: string
  skill: Skill
}

interface FormErrors {
  business?: string
  title?: string
  budget?: string
  days?: string
}

const initialValues: FormValues = {
  business: '',
  title: '',
  description: '',
  budget: '',
  days: '',
  skill: 'Сайты',
}

export default function PlaceOrder({ onPublish }: PlaceOrderProps) {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const business = values.business.trim()
    const title = values.title.trim()
    const budget = Number(values.budget)
    const days = Number(values.days)
    const nextErrors: FormErrors = {}

    if (business.length < 2) {
      nextErrors.business = 'Укажите название бизнеса (от 2 символов)'
    }
    if (title.length < 5) {
      nextErrors.title = 'Название задачи должно быть от 5 символов'
    }
    if (!values.budget || !Number.isFinite(budget) || budget < 100 || budget > 500_000) {
      nextErrors.budget = 'Бюджет должен быть от 100 до 500 000 сом'
    }
    if (!values.days || !Number.isInteger(days) || days < 1 || days > 60) {
      nextErrors.days = 'Срок должен быть целым числом от 1 до 60 дней'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const published = await onPublish({
        title,
        business,
        days,
        skill: values.skill,
        description: values.description.trim(),
        price: budget,
      })
      if (published) setValues(initialValues)
    } finally {
      setSubmitting(false)
    }
  }

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  return (
    <form
      className="card-background mb-3 rounded-xl border border-default p-4"
      noValidate
      onSubmit={submitOrder}
    >
      <h2 className="text-base font-semibold">Новый заказ</h2>
      <p className="text-secondary mt-1 text-[13px]">
        Опишите задачу понятно. Студенты увидят её в ленте.
      </p>

      <div className="mt-3">
        <label htmlFor="order-business" className="text-secondary mb-3 block text-sm">
          Название бизнеса
          <input
            id="order-business"
            type="text"
            maxLength={60}
            value={values.business}
            aria-invalid={Boolean(errors.business)}
            aria-describedby={errors.business ? 'order-business-error' : undefined}
            placeholder="Кафе, салон, магазин"
            onChange={(event) => update('business', event.target.value)}
            className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
          />
          {errors.business && (
            <span id="order-business-error" className="text-error mt-1 block text-sm">
              {errors.business}
            </span>
          )}
        </label>

        <label htmlFor="order-title" className="text-secondary mb-3 block text-sm">
          Задача
          <input
            id="order-title"
            type="text"
            maxLength={80}
            value={values.title}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'order-title-error' : undefined}
            placeholder="Например: страница с меню и ценами"
            onChange={(event) => update('title', event.target.value)}
            className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
          />
          {errors.title && (
            <span id="order-title-error" className="text-error mt-1 block text-sm">
              {errors.title}
            </span>
          )}
        </label>

        <label htmlFor="order-description" className="text-secondary mb-3 block text-sm">
          Что нужно сделать
          <textarea
            id="order-description"
            rows={4}
            maxLength={500}
            value={values.description}
            placeholder="Что есть, что нужно получить, к какому сроку"
            onChange={(event) => update('description', event.target.value)}
            className="field-control mt-1.5 min-h-[88px] w-full resize-y rounded-[10px] border px-3 py-2.5 text-[15px]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label htmlFor="order-budget" className="text-secondary mb-3 block text-sm">
            Бюджет, сом
            <input
              id="order-budget"
              type="number"
              min="100"
              max="500000"
              inputMode="numeric"
              value={values.budget}
              aria-invalid={Boolean(errors.budget)}
              aria-describedby={errors.budget ? 'order-budget-error' : undefined}
              placeholder="1500"
              onChange={(event) => update('budget', event.target.value)}
              className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
            />
            {errors.budget && (
              <span id="order-budget-error" className="text-error mt-1 block text-sm">
                {errors.budget}
              </span>
            )}
          </label>
          <label htmlFor="order-days" className="text-secondary mb-3 block text-sm">
            Срок, дней
            <input
              id="order-days"
              type="number"
              min="1"
              max="60"
              step="1"
              inputMode="numeric"
              value={values.days}
              aria-invalid={Boolean(errors.days)}
              aria-describedby={errors.days ? 'order-days-error' : undefined}
              placeholder="5"
              onChange={(event) => update('days', event.target.value)}
              className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
            />
            {errors.days && (
              <span id="order-days-error" className="text-error mt-1 block text-sm">
                {errors.days}
              </span>
            )}
          </label>
        </div>

        <label htmlFor="order-skill" className="text-secondary mb-3 block text-sm">
          Навык
          <select
            id="order-skill"
            value={values.skill}
            onChange={(event) => {
              const skill = skills.find((option) => option === event.target.value)
              if (skill) update('skill', skill)
            }}
            className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
          >
            {skills.map((skill) => (
              <option key={skill}>{skill}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="button-primary sticky bottom-20 z-10 min-h-11 w-full rounded-[10px] px-4 py-2.5 shadow-md"
        >
          {submitting ? 'Публикуем…' : 'Опубликовать заказ'}
        </button>
      </div>
    </form>
  )
}
