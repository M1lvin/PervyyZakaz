import { useState, type FormEvent } from 'react'
import { skills, type MyOrder } from '../data/orders'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Card from './ui/Card'
import Input from './ui/Input'
import { supabase } from '../lib/supabase'

interface FeedProps {
  orders: MyOrder[]
  userId: string
  onTakeOrder: (orderId: string, price: number, days: number, message: string) => Promise<boolean>
  notice?: string | null
}

interface ResponseDraft {
  price: string
  days: string
  message: string
}

interface ResponseErrors {
  price?: string
  days?: string
  form?: string
}

const emptyDraft: ResponseDraft = { price: '', days: '', message: '' }

function responseForOrder(order: MyOrder): OrderDraftForm {
  return { ...emptyDraft, price: String(order.price), days: String(order.days) }
}

interface OrderDraftForm extends ResponseDraft {}

export default function Feed({ orders, userId, onTakeOrder, notice }: FeedProps) {
  const [skillFilter, setSkillFilter] = useState<string>('Все')
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ResponseDraft>(emptyDraft)
  const [errors, setErrors] = useState<ResponseErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [aiBusy, setAiBusy] = useState<'reply' | 'price' | null>(null)
  const [aiError, setAiError] = useState('')
  const [aiUnavailable, setAiUnavailable] = useState(false)

  const visibleOrders = orders.filter(
    (order) =>
      order.status === 'open' && (skillFilter === 'Все' || order.skill === skillFilter),
  )

  function openResponseForm(order: MyOrder) {
    setOpenOrderId(order.id)
    setDraft(responseForOrder(order))
    setErrors({})
    setAiError('')
  }

  function closeResponseForm() {
    setOpenOrderId(null)
    setDraft(emptyDraft)
    setErrors({})
    setAiError('')
  }

  async function requestAi(action: 'reply' | 'price', order: MyOrder) {
    if (!supabase || aiBusy) return

    setAiBusy(action)
    setAiError('')
    try {
      const { data, error } = await supabase.functions.invoke<{
        text?: string
        error?: string
      }>('ai-helper', {
        body: {
          action,
          title: order.title,
          description: order.description,
          skill: order.skill,
          budget: order.price,
          days: order.days,
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
      const suggestedPrice = data.text.match(/\d[\d\s]*/)?.[0]?.replace(/\s/g, '')
      if (action === 'price' && !suggestedPrice) {
        setAiError(data.text)
        return
      }
      setDraft((current) =>
        action === 'reply'
          ? { ...current, message: data.text ?? '' }
          : { ...current, price: suggestedPrice ?? current.price },
      )
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : 'AI-помощник временно недоступен. Попробуйте позже.',
      )
    } finally {
      setAiBusy(null)
    }
  }

  async function submitResponse(event: FormEvent<HTMLFormElement>, order: MyOrder) {
    event.preventDefault()
    const price = Number(draft.price)
    const days = Number(draft.days)
    const message = draft.message.trim()
    const nextErrors: ResponseErrors = {}

    if (!draft.price || !Number.isInteger(price) || price < 1 || price > 500_000) {
      nextErrors.price = 'Укажите цену от 1 до 500 000 сом'
    }
    if (!draft.days || !Number.isInteger(days) || days < 1 || days > 60) {
      nextErrors.days = 'Укажите срок от 1 до 60 дней'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      if (await onTakeOrder(order.id, price, days, message)) {
        closeResponseForm()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section aria-label="Лента заказов">
      {notice && (
        <p role="status" className="feedback-success mb-3 rounded-[10px] px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      <div className="mb-3 mt-1">
        <label htmlFor="skill-filter" className="sr-only">
          Фильтр по навыку
        </label>
        <select
          id="skill-filter"
          value={skillFilter}
          onChange={(event) => setSkillFilter(event.target.value)}
          className="ui-input w-full max-w-60"
        >
          <option>Все</option>
          {skills.map((skill) => (
            <option key={skill}>{skill}</option>
          ))}
        </select>
      </div>

      {visibleOrders.length > 0 ? (
        visibleOrders.map((order) => (
          <Card
            as="article"
            key={order.id}
            className="mb-3 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">{order.title}</h2>
              <span className="text-accent shrink-0 whitespace-nowrap font-semibold">
                {order.price.toLocaleString('ru-RU')} сом
              </span>
            </div>
            <p className="text-secondary mt-1 text-[13px]">
              {order.business} · {order.days} дн. · <Badge>{order.skill}</Badge>
            </p>
            <p className="mb-3.5 mt-2.5 text-[15px]">{order.description}</p>

            {openOrderId === order.id ? (
              <form
                className="mt-3"
                noValidate
                onSubmit={(event) => submitResponse(event, order)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id={`price-${order.id}`}
                    label="Ваша цена, сом"
                    type="number"
                    min="1"
                    max="500000"
                    step="1"
                    inputMode="numeric"
                    value={draft.price}
                    error={errors.price}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, price: event.target.value }))
                    }
                  />
                  <Input
                    id={`days-${order.id}`}
                    label="Срок, дней"
                    type="number"
                    min="1"
                    max="60"
                    step="1"
                    inputMode="numeric"
                    value={draft.days}
                    error={errors.days}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, days: event.target.value }))
                    }
                  />
                </div>
                <label className="text-secondary mb-3 block text-sm">
                  Сообщение заказчику
                  <textarea
                    rows={3}
                    maxLength={400}
                    value={draft.message}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, message: event.target.value }))
                    }
                    className="ui-input mt-1.5 min-h-[88px] w-full resize-y text-[15px]"
                  />
                </label>
                {supabase && !aiUnavailable && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={aiBusy !== null}
                      onClick={() => void requestAi('reply', order)}
                    >
                      {aiBusy === 'reply' ? 'Думаю...' : 'Написать за меня'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={aiBusy !== null}
                      onClick={() => void requestAi('price', order)}
                    >
                      {aiBusy === 'price' ? 'Думаю...' : 'Подсказать цену'}
                    </Button>
                  </div>
                )}
                {aiError && (
                  <p role="alert" className="text-error mb-2 text-sm">
                    {aiError}
                  </p>
                )}
                {errors.form && (
                  <p role="alert" className="text-error mb-2 text-sm">
                    {errors.form}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={submitting || aiBusy !== null}
                    variant="primary"
                  >
                    {submitting ? 'Отправляем…' : 'Отправить отклик'}
                  </Button>
                  <Button
                    type="button"
                    disabled={submitting || aiBusy !== null}
                    onClick={closeResponseForm}
                    variant="secondary"
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            ) : (
              order.createdBy === userId ? (
                <p className="text-secondary text-[13px]">
                  Это ваш заказ. Студенты увидят его здесь.
                </p>
              ) : (
                <Button
                  type="button"
                  onClick={() => openResponseForm(order)}
                  variant="primary"
                >
                  Откликнуться
                </Button>
              )
            )}
          </Card>
        ))
      ) : (
        <Card className="text-secondary px-3 py-10 text-center">
          <h2 className="text-primary mb-1 text-base font-semibold">Пока нет заказов</h2>
          <p>Попробуйте выбрать другой навык.</p>
        </Card>
      )}
    </section>
  )
}
