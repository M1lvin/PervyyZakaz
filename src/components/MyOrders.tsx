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
      <div className="text-secondary px-3 py-10 text-center">
        <h2 className="text-primary mb-1 text-base font-semibold">Здесь пока пусто</h2>
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
            className="card-background mb-3 rounded-xl border border-default p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">{order.title}</h2>
              <span className="text-accent shrink-0 whitespace-nowrap font-semibold">
                {price.toLocaleString('ru-RU')} сом
              </span>
            </div>
            <p className="text-secondary mt-1 text-[13px]">
              {order.business} · {days} дн.
            </p>
            <p className="text-accent mt-2.5 text-sm font-semibold">
              {statusLabels[order.status]}
            </p>
            {takenByMe && order.status === 'in_progress' && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onStatusChange(order.id, 'done')}
                  className="button-primary min-h-11 rounded-[10px] px-4 py-2.5"
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
                  className="button-primary min-h-11 rounded-[10px] px-4 py-2.5"
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
