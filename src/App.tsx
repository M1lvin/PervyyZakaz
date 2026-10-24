import { useState } from 'react'
import Feed from './components/Feed'
import PlaceOrder from './components/PlaceOrder'
import { orders as initialOrders, type Order } from './data/orders'

const tabs = ['Лента', 'Разместить', 'Мои заказы', 'Профиль'] as const

type Tab = (typeof tabs)[number]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Лента')
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [notice, setNotice] = useState<string | null>(null)

  function publishOrder(order: Order) {
    setOrders((current) => [order, ...current])
    setActiveTab('Лента')
    setNotice('Заказ опубликован')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-[#f6f5f1] text-[#1d1c19]">
      <header className="px-5 pb-3 pt-5">
        <h1 className="text-[22px] font-semibold tracking-tight">Первый заказ</h1>
        <p className="mt-0.5 text-sm text-[#6f6c64]">
          Задачи от местного бизнеса для студентов
        </p>
      </header>

      <main className="flex-1 px-4 pb-6 pt-1">
        {activeTab === 'Лента' ? (
          <Feed orders={orders} notice={notice} />
        ) : activeTab === 'Разместить' ? (
          <PlaceOrder onPublish={publishOrder} />
        ) : (
          <h2 className="text-base font-semibold">{activeTab}</h2>
        )}
      </main>

      <nav
        aria-label="Разделы"
        className="sticky bottom-0 grid grid-cols-4 gap-1 border-t border-[#e3e0d7] bg-white px-2 pt-1.5"
        style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            aria-current={activeTab === tab ? 'page' : undefined}
            className={`min-h-[52px] rounded-lg px-1 py-1 text-xs ${
              activeTab === tab
                ? 'font-semibold text-[#1f6f5c]'
                : 'text-[#6f6c64]'
            }`}
            onClick={() => {
              setNotice(null)
              setActiveTab(tab)
            }}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  )
}
