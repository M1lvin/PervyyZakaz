import { useState, type FormEvent } from 'react'
import { skills, type MyOrder } from '../data/orders'

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

  const visibleOrders = orders.filter(
    (order) =>
      order.status === 'open' && (skillFilter === 'Все' || order.skill === skillFilter),
  )

  function openResponseForm(order: MyOrder) {
    setOpenOrderId(order.id)
    setDraft(responseForOrder(order))
    setErrors({})
  }

  function closeResponseForm() {
    setOpenOrderId(null)
    setDraft(emptyDraft)
    setErrors({})
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
          className="field-control min-h-11 w-full max-w-60 rounded-[10px] border px-3 py-2.5 text-[15px]"
        >
          <option>Все</option>
          {skills.map((skill) => (
            <option key={skill}>{skill}</option>
          ))}
        </select>
      </div>

      {visibleOrders.length > 0 ? (
        visibleOrders.map((order) => (
          <article
            key={order.id}
            className="card-background mb-3 rounded-xl border border-default p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">{order.title}</h2>
              <span className="text-accent shrink-0 whitespace-nowrap font-semibold">
                {order.price.toLocaleString('ru-RU')} сом
              </span>
            </div>
            <p className="text-secondary mt-1 text-[13px]">
              {order.business} · {order.days} дн. · {order.skill}
            </p>
            <p className="mb-3.5 mt-2.5 text-[15px]">{order.description}</p>

            {openOrderId === order.id ? (
              <form
                className="mt-3"
                noValidate
                onSubmit={(event) => submitResponse(event, order)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-secondary mb-3 block text-sm">
                    Ваша цена, сом
                    <input
                      type="number"
                      min="1"
                      max="500000"
                      step="1"
                      inputMode="numeric"
                      value={draft.price}
                      aria-invalid={Boolean(errors.price)}
                      aria-describedby={errors.price ? `price-error-${order.id}` : undefined}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, price: event.target.value }))
                      }
                      className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
                    />
                    {errors.price && (
                      <span id={`price-error-${order.id}`} className="text-error mt-1 block text-sm">
                        {errors.price}
                      </span>
                    )}
                  </label>
                  <label className="text-secondary mb-3 block text-sm">
                    Срок, дней
                    <input
                      type="number"
                      min="1"
                      max="60"
                      step="1"
                      inputMode="numeric"
                      value={draft.days}
                      aria-invalid={Boolean(errors.days)}
                      aria-describedby={errors.days ? `days-error-${order.id}` : undefined}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, days: event.target.value }))
                      }
                      className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
                    />
                    {errors.days && (
                      <span id={`days-error-${order.id}`} className="text-error mt-1 block text-sm">
                        {errors.days}
                      </span>
                    )}
                  </label>
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
                    className="field-control mt-1.5 min-h-[88px] w-full resize-y rounded-[10px] border px-3 py-2.5 text-[15px]"
                  />
                </label>
                {errors.form && (
                  <p role="alert" className="text-error mb-2 text-sm">
                    {errors.form}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="button-primary min-h-11 rounded-[10px] px-4 py-2.5"
                  >
                    {submitting ? 'Отправляем…' : 'Отправить отклик'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={closeResponseForm}
                    className="button-secondary min-h-11 rounded-[10px] px-4 py-2.5"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              order.createdBy === userId ? (
                <p className="text-secondary text-[13px]">
                  Это ваш заказ. Студенты увидят его здесь.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => openResponseForm(order)}
                  className="button-primary min-h-11 rounded-[10px] px-4 py-2.5"
                >
                  Откликнуться
                </button>
              )
            )}
          </article>
        ))
      ) : (
        <div className="text-secondary px-3 py-10 text-center">
          <h2 className="text-primary mb-1 text-base font-semibold">Пока нет заказов</h2>
          <p>Попробуйте выбрать другой навык.</p>
        </div>
      )}
    </section>
  )
}
