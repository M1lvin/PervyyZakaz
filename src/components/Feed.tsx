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
  message?: string
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
    if (message.length < 2) {
      nextErrors.message = 'Сообщение должно быть не короче 2 символов'
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
        <p role="status" className="mb-3 rounded-[10px] bg-[#e4f0eb] px-4 py-3 text-sm text-[#1f6f5c]">
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
          className="min-h-11 w-full max-w-60 rounded-[10px] border border-[#e3e0d7] bg-white px-3 py-2.5 text-[15px] text-[#1d1c19]"
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
            className="mb-3 rounded-xl border border-[#e3e0d7] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">{order.title}</h2>
              <span className="shrink-0 whitespace-nowrap font-semibold text-[#1f6f5c]">
                {order.price.toLocaleString('ru-RU')} сом
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[#6f6c64]">
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
                  <label className="mb-3 block text-sm text-[#6f6c64]">
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
                      className="mt-1.5 min-h-11 w-full rounded-[10px] border border-[#e3e0d7] bg-white px-3 py-2.5 text-[15px] text-[#1d1c19]"
                    />
                    {errors.price && (
                      <span id={`price-error-${order.id}`} className="mt-1 block text-sm text-[#a23b2c]">
                        {errors.price}
                      </span>
                    )}
                  </label>
                  <label className="mb-3 block text-sm text-[#6f6c64]">
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
                      className="mt-1.5 min-h-11 w-full rounded-[10px] border border-[#e3e0d7] bg-white px-3 py-2.5 text-[15px] text-[#1d1c19]"
                    />
                    {errors.days && (
                      <span id={`days-error-${order.id}`} className="mt-1 block text-sm text-[#a23b2c]">
                        {errors.days}
                      </span>
                    )}
                  </label>
                </div>
                <label className="mb-3 block text-sm text-[#6f6c64]">
                  Сообщение заказчику
                  <textarea
                    rows={3}
                    maxLength={400}
                    value={draft.message}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? `message-error-${order.id}` : undefined}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, message: event.target.value }))
                    }
                    className="mt-1.5 min-h-[88px] w-full resize-y rounded-[10px] border border-[#e3e0d7] bg-white px-3 py-2.5 text-[15px] text-[#1d1c19]"
                  />
                  {errors.message && (
                    <span id={`message-error-${order.id}`} className="mt-1 block text-sm text-[#a23b2c]">
                      {errors.message}
                    </span>
                  )}
                </label>
                {errors.form && (
                  <p role="alert" className="mb-2 text-sm text-[#a23b2c]">
                    {errors.form}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-11 rounded-[10px] border border-[#1f6f5c] bg-[#1f6f5c] px-4 py-2.5 text-white"
                  >
                    {submitting ? 'Отправляем…' : 'Отправить'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={closeResponseForm}
                    className="min-h-11 rounded-[10px] border border-[#e3e0d7] bg-white px-4 py-2.5 text-[#1d1c19]"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              order.createdBy === userId ? (
                <p className="text-[13px] text-[#6f6c64]">
                  Это ваш заказ. Студенты увидят его здесь.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => openResponseForm(order)}
                  className="min-h-11 rounded-[10px] border border-[#1f6f5c] bg-[#1f6f5c] px-4 py-2.5 text-white"
                >
                  Откликнуться
                </button>
              )
            )}
          </article>
        ))
      ) : (
        <div className="px-3 py-10 text-center text-[#6f6c64]">
          <h2 className="mb-1 text-base font-semibold text-[#1d1c19]">Пока нет заказов</h2>
          <p>Попробуйте выбрать другой навык.</p>
        </div>
      )}
    </section>
  )
}
