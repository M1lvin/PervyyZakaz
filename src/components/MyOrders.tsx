import type { MyOrder, OrderStatus } from '../data/orders'

interface MyOrdersProps {
  orders: MyOrder[]
  userId: string
  onStatusChange: (orderId: string, status: OrderStatus) => void
}

const statusLabels: Record<OrderStatus, string> = {
  open: 'Ищем исполнителя',
  in_progress: 'В работе',
  done: 'Сдано, ждём оплату',
  paid: 'Оплачено',
}

export default function MyOrders({ orders, userId, onStatusChange }: MyOrdersProps) {
  const myOrders = orders.filter(
    (order) => order.takenBy === userId || order.createdBy === userId,
  )

  if (myOrders.length === 0) {
    return (
      <div className="px-3 py-10 text-center text-[#6f6c64]">
        <h2 className="mb-1 text-base font-semibold text-[#1d1c19]">Здесь пока пусто</h2>
        <p>
          Откликнитесь на заказ в ленте, и он появится здесь. Свою задачу можно разместить во
          вкладке «Разместить».
        </p>
      </div>
    )
  }

  return (
    <section aria-label="Мои заказы">
      {myOrders.map((order) => {
        const takenByMe = order.takenBy === userId
        const createdByMe = order.createdBy === userId
        const price = takenByMe ? order.responsePrice ?? order.price : order.price
        const days = takenByMe ? order.responseDays ?? order.days : order.days

        return (
          <article
            key={order.id}
            className="mb-3 rounded-xl border border-[#e3e0d7] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">{order.title}</h2>
              <span className="shrink-0 whitespace-nowrap font-semibold text-[#1f6f5c]">
                {price.toLocaleString('ru-RU')} сом
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[#6f6c64]">
              {order.business} · {days} дн.
            </p>
            <p className="mt-2.5 text-sm font-semibold text-[#1f6f5c]">
              {statusLabels[order.status]}
            </p>
            {takenByMe && order.status === 'in_progress' && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onStatusChange(order.id, 'done')}
                  className="min-h-11 rounded-[10px] border border-[#1f6f5c] bg-[#1f6f5c] px-4 py-2.5 text-white"
                >
                  Отметить сданным
                </button>
              </div>
            )}
            {createdByMe && order.status === 'done' && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onStatusChange(order.id, 'paid')}
                  className="min-h-11 rounded-[10px] border border-[#1f6f5c] bg-[#1f6f5c] px-4 py-2.5 text-white"
                >
                  Оплату получил
                </button>
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}
