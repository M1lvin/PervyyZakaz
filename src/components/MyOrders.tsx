import type { MyOrder, OrderStatus } from '../data/orders'
import { Inbox } from 'lucide-react'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Card from './ui/Card'
import { formatSom } from '../lib/format'

interface MyOrdersProps {
  orders: MyOrder[]
  userId: string
  onStatusChange: (orderId: string, status: OrderStatus) => void
  onNavigateToFeed: () => void
}

const statusLabels: Record<OrderStatus, string> = {
  open: 'Ищем исполнителя',
  in_progress: 'В работе',
  done: 'Сдано, ждём оплату',
  paid: 'Оплачено',
}

export default function MyOrders({ orders, userId, onStatusChange, onNavigateToFeed }: MyOrdersProps) {
  const myOrders = orders.filter(
    (order) => order.takenBy === userId || order.createdBy === userId,
  )

  if (myOrders.length === 0) {
    return (
      <Card className="empty-state">
        <span className="empty-state-icon"><Inbox aria-hidden="true" size={40} strokeWidth={1.75} /></span>
        <h2>Здесь пока пусто</h2>
        <p>Ваши заказы появятся здесь после отклика или публикации.</p>
        <Button type="button" variant="secondary" onClick={onNavigateToFeed}>
          Открыть ленту
        </Button>
      </Card>
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
          <Card
            as="article"
            key={order.id}
            className="mb-3 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">{order.title}</h2>
              <span className="money text-accent shrink-0 whitespace-nowrap font-semibold">
                {formatSom(price)}
              </span>
            </div>
            <p className="text-secondary mt-1 text-[13px]">
              {order.business} · {days} дн.
            </p>
            <p className="mt-2.5">
              <Badge status={order.status}>{statusLabels[order.status]}</Badge>
            </p>
            {takenByMe && order.status === 'in_progress' && (
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => onStatusChange(order.id, 'done')}
                  variant="primary"
                >
                  Отметить сданным
                </Button>
              </div>
            )}
            {createdByMe && order.status === 'done' && (
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => onStatusChange(order.id, 'paid')}
                  variant="primary"
                >
                  Оплату получил
                </Button>
              </div>
            )}
          </Card>
        )
      })}
    </section>
  )
}
