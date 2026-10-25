import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Auth from './components/Auth'
import Feed from './components/Feed'
import MyOrders from './components/MyOrders'
import PlaceOrder from './components/PlaceOrder'
import Profile, { FirstOrderStamp, loadProfile, type UserProfile } from './components/Profile'
import { supabase } from './lib/supabase'
import {
  orderStatuses,
  orders as initialOrders,
  skills,
  type MyOrder,
  type Order,
  type OrderStatus,
} from './data/orders'

const tabs = ['Лента', 'Разместить', 'Мои заказы', 'Профиль'] as const
const ordersStorageKey = 'pervyy-zakaz-orders-v1'
const userIdStorageKey = 'pervyy-zakaz-user-v1'

type Tab = (typeof tabs)[number]

function asMyOrder(order: Order): MyOrder {
  return {
    ...order,
    status: 'open',
    createdBy: null,
    takenBy: null,
  }
}

function isMyOrder(value: unknown): value is MyOrder {
  if (typeof value !== 'object' || value === null) return false
  const order = value as Record<string, unknown>
  return (
    typeof order.id === 'string' &&
    typeof order.title === 'string' &&
    typeof order.business === 'string' &&
    typeof order.description === 'string' &&
    typeof order.days === 'number' &&
    typeof order.price === 'number' &&
    skills.some((skill) => skill === order.skill) &&
    orderStatuses.some((status) => status === order.status) &&
    (typeof order.createdBy === 'string' || order.createdBy === null) &&
    (typeof order.takenBy === 'string' || order.takenBy === null) &&
    (order.responsePrice === undefined || typeof order.responsePrice === 'number') &&
    (order.responseDays === undefined || typeof order.responseDays === 'number')
  )
}

function loadOrders(): MyOrder[] {
  const stored = localStorage.getItem(ordersStorageKey)
  if (stored === null) return initialOrders.map(asMyOrder)

  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed) || !parsed.every(isMyOrder)) {
    throw new Error('Сохранённые заказы имеют неверный формат.')
  }
  return parsed
}

function loadUserId(): string {
  const stored = localStorage.getItem(userIdStorageKey)
  if (stored !== null) return stored

  const userId = crypto.randomUUID()
  localStorage.setItem(userIdStorageKey, userId)
  return userId
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Лента')
  const [userId] = useState(loadUserId)
  const [orders, setOrders] = useState<MyOrder[]>(loadOrders)
  const [profile, setProfile] = useState<UserProfile>(loadProfile)
  const [notice, setNotice] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    localStorage.setItem(ordersStorageKey, JSON.stringify(orders))
  }, [orders])

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    let active = true
    const client = supabase
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setAuthError('')
      setAuthLoading(false)
    })

    client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setAuthError('Не удалось проверить вход. Обновите страницу и попробуйте ещё раз')
      } else {
        setSession(data.session)
      }
      setAuthLoading(false)
    }).catch(() => {
      if (!active) return
      setAuthError('Не удалось связаться с сервером. Проверьте подключение к интернету')
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  function publishOrder(order: Order) {
    setOrders((current) => [
      { ...order, status: 'open', createdBy: userId, takenBy: null },
      ...current,
    ])
    setActiveTab('Лента')
    setNotice('Заказ опубликован')
  }

  function takeOrder(orderId: string, price: number, days: number) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: 'in_progress',
              takenBy: userId,
              responsePrice: price,
              responseDays: days,
            }
          : order,
      ),
    )
  }

  function changeOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((current) =>
      current.map((order) => {
        const canMarkDone =
          order.takenBy === userId && order.status === 'in_progress' && status === 'done'
        const canMarkPaid =
          order.createdBy === userId && order.status === 'done' && status === 'paid'
        return order.id === orderId && (canMarkDone || canMarkPaid)
          ? { ...order, status }
          : order
      }),
    )
  }

  async function signOut() {
    if (!supabase) return
    try {
      const { error } = await supabase.auth.signOut()
      if (error) setAuthError('Не удалось выйти из аккаунта. Попробуйте ещё раз')
    } catch {
      setAuthError('Не удалось связаться с сервером. Проверьте подключение к интернету')
    }
  }

  if (!supabase) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[480px] items-center px-4">
        <p role="alert" className="rounded-xl border border-[#e3e0d7] bg-white p-4 text-sm text-[#a23b2c]">
          Для входа настройте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в файле .env
        </p>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[480px] items-center justify-center text-sm text-[#6f6c64]">
        Проверяем вход…
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-[#f6f5f1] text-[#1d1c19]">
        {authError && (
          <p role="alert" className="mx-4 mt-4 text-sm text-[#a23b2c]">
            {authError}
          </p>
        )}
        <Auth client={supabase} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-[#f6f5f1] text-[#1d1c19]">
      <header className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Первый заказ</h1>
            <p className="mt-0.5 text-sm text-[#6f6c64]">
              Задачи от местного бизнеса для студентов
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {orders.some((order) => order.takenBy === userId && order.status === 'paid') && (
              <FirstOrderStamp earned small />
            )}
            <button
              type="button"
              onClick={signOut}
              className="min-h-11 rounded-[10px] border border-[#e3e0d7] bg-white px-3 py-2 text-sm text-[#1d1c19]"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-1">
        {authError && (
          <p role="alert" className="mb-3 text-sm text-[#a23b2c]">
            {authError}
          </p>
        )}
        {activeTab === 'Лента' ? (
          <Feed orders={orders} userId={userId} onTakeOrder={takeOrder} notice={notice} />
        ) : activeTab === 'Разместить' ? (
          <PlaceOrder onPublish={publishOrder} />
        ) : activeTab === 'Мои заказы' ? (
          <MyOrders orders={orders} userId={userId} onStatusChange={changeOrderStatus} />
        ) : activeTab === 'Профиль' ? (
          <Profile
            profile={profile}
            orders={orders}
            userId={userId}
            onSave={setProfile}
          />
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
