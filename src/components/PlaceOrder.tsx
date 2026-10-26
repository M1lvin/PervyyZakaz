import { useState, type FormEvent } from 'react'
import { skills, type Order, type Skill } from '../data/orders'
import Button from './ui/Button'
import Card from './ui/Card'
import Input from './ui/Input'
import { supabase } from '../lib/supabase'

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
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiUnavailable, setAiUnavailable] = useState(false)

  async function improveDescription() {
    if (!supabase || aiBusy) return

    setAiBusy(true)
    setAiError('')
    try {
      const { data, error } = await supabase.functions.invoke<{
        text?: string
        error?: string
      }>('ai-helper', {
        body: {
          action: 'improve',
          title: values.title,
          description: values.description,
          skill: values.skill,
          budget: Number(values.budget) || 0,
          days: Number(values.days) || 0,
        },
      })
      if (error) {
        setAiUnavailable(true)
        throw new Error('AI-помощник временно недоступен. Попробуйте позже.')
      }
      if (data?.error) {
        setAiError(data.error)
        return
      }
      if (!data?.text) {
        setAiError('Не удалось получить ответ AI. Попробуйте позже.')
        return
      }
      update('description', data.text)
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : 'AI-помощник временно недоступен. Попробуйте позже.',
      )
    } finally {
      setAiBusy(false)
    }
  }

  async function submitOrder(event: FormEvent<HTMLElement>) {
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
    <Card as="form" className="mb-3 p-4" noValidate onSubmit={submitOrder}>
      <h2 className="text-base font-semibold">Новый заказ</h2>
      <p className="text-secondary mt-1 text-[13px]">
        Опишите задачу понятно. Студенты увидят её в ленте.
      </p>

      <div className="mt-3">
        <Input
          id="order-business"
          label="Название бизнеса"
          type="text"
          maxLength={60}
          value={values.business}
          error={errors.business}
          placeholder="Кафе, салон, магазин"
          onChange={(event) => update('business', event.target.value)}
          className="mb-3"
        />

        <Input
          id="order-title"
          label="Задача"
          type="text"
          maxLength={80}
          value={values.title}
          error={errors.title}
          placeholder="Например: страница с меню и ценами"
          onChange={(event) => update('title', event.target.value)}
          className="mb-3"
        />

        <div className="mb-3">
          <label htmlFor="order-description" className="text-secondary block text-sm">
            Что нужно сделать
          </label>
          <textarea
            id="order-description"
            rows={4}
            maxLength={500}
            value={values.description}
            placeholder="Что есть, что нужно получить, к какому сроку"
            onChange={(event) => update('description', event.target.value)}
            className="ui-input mt-1.5 min-h-[88px] w-full resize-y text-[15px]"
          />
          {supabase && !aiUnavailable && (
            <Button
              type="button"
              variant="secondary"
              disabled={aiBusy}
              onClick={() => void improveDescription()}
              className="mt-2"
            >
              {aiBusy ? 'Думаю...' : 'Улучшить описание'}
            </Button>
          )}
        </div>
        {aiError && (
          <p role="alert" className="text-error mb-3 text-sm">
            {aiError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="order-budget"
            label="Бюджет, сом"
            type="number"
            min="100"
            max="500000"
            inputMode="numeric"
            value={values.budget}
            error={errors.budget}
            placeholder="1500"
            onChange={(event) => update('budget', event.target.value)}
          />
          <Input
            id="order-days"
            label="Срок, дней"
            type="number"
            min="1"
            max="60"
            step="1"
            inputMode="numeric"
            value={values.days}
            error={errors.days}
            placeholder="5"
            onChange={(event) => update('days', event.target.value)}
          />
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
            className="ui-input mt-1.5 w-full"
          >
            {skills.map((skill) => (
              <option key={skill}>{skill}</option>
            ))}
          </select>
        </label>

        <Button
          type="submit"
          disabled={submitting || aiBusy}
          variant="primary"
          className="sticky bottom-20 z-10 w-full shadow-md"
        >
          {submitting ? 'Публикуем…' : 'Опубликовать заказ'}
        </Button>
      </div>
    </Card>
  )
}
