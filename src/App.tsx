import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Auth from './components/Auth'
import Feed from './components/Feed'
import MyOrders from './components/MyOrders'
import PlaceOrder from './components/PlaceOrder'
import Profile, { FirstOrderStamp, type UserProfile } from './components/Profile'
import { supabase } from './lib/supabase'
import type { MyOrder, Order, OrderStatus } from './data/orders'
import {
  createOrder,
  loadOrders,
  orderErrorMessage,
  takeOrder as submitOrderResponse,
  updateOrderStatus,
} from './lib/orders'
import {
  loadProfile as fetchProfile,
  profileErrorMessage,
  saveProfile as upsertProfile,
} from './lib/profiles'

const tabs = ['Лента', 'Разместить', 'Мои заказы', 'Профиль'] as const

type Tab = (typeof tabs)[number]

const emptyProfile: UserProfile = { name: '', contact: '', skills: [] }

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Лента')
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [profile, setProfile] = useState<UserProfile>(emptyProfile)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [ordersReload, setOrdersReload] = useState(0)
  const userId = session?.user.id ?? ''

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

  useEffect(() => {
    if (!session) {
      setOrders([])
      setOrdersLoading(false)
      return
    }
    if (!supabase) return

    let active = true
    const client = supabase
    setOrdersLoading(true)
    setOrdersError('')
    loadOrders(client)
      .then((loadedOrders) => {
        if (active) setOrders(loadedOrders)
      })
      .catch((error: unknown) => {
        if (active) setOrdersError(orderErrorMessage(error))
      })
      .finally(() => {
        if (active) setOrdersLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId, ordersReload, session])

  useEffect(() => {
    if (!userId || !supabase) {
      setProfile(emptyProfile)
      setProfileLoading(false)
      setProfileError('')
      return
    }

    let active = true
    const client = supabase
    setProfile(emptyProfile)
    setProfileLoading(true)
    setProfileError('')
    fetchProfile(client, userId)
      .then((loadedProfile) => {
        if (active) setProfile(loadedProfile)
      })
      .catch((error: unknown) => {
        if (active) setProfileError(profileErrorMessage(error))
      })
      .finally(() => {
        if (active) setProfileLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  async function publishOrder(order: Order): Promise<boolean> {
    if (!supabase || !userId) {
      setOrdersError('Войдите в аккаунт, чтобы опубликовать заказ.')
      return false
    }

    setOrdersError('')
    try {
      const createdOrder = await createOrder(supabase, order, userId)
      setOrders((current) => [createdOrder, ...current])
      setActiveTab('Лента')
      setNotice('Заказ опубликован')
      return true
    } catch (error) {
      setOrdersError(orderErrorMessage(error))
      return false
    }
  }

  async function takeOrder(
    orderId: string,
    price: number,
    days: number,
    message: string,
  ): Promise<boolean> {
    if (!supabase || !userId) {
      setOrdersError('Войдите в аккаунт, чтобы откликнуться на заказ.')
      return false
    }

    setOrdersError('')
    try {
      const updatedOrder = await submitOrderResponse(supabase, orderId, userId, price, days, message)
      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order))
      return true
    } catch (error) {
      setOrdersError(orderErrorMessage(error))
      return false
    }
  }

  async function changeOrderStatus(orderId: string, status: OrderStatus) {
    if (!supabase || !userId || (status !== 'done' && status !== 'paid')) return

    setOrdersError('')
    try {
      const updatedOrder = await updateOrderStatus(supabase, orderId, userId, status)
      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order))
    } catch (error) {
      setOrdersError(orderErrorMessage(error))
    }
  }

  async function saveUserProfile(nextProfile: UserProfile): Promise<boolean> {
    if (!supabase || !userId) {
      setProfileError('Войдите в аккаунт, чтобы сохранить профиль.')
      return false
    }

    setProfileError('')
    try {
      await upsertProfile(supabase, userId, nextProfile)
      setProfile(nextProfile)
      return true
    } catch (error) {
      setProfileError(profileErrorMessage(error))
      return false
    }
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
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-1">
        {authError && (
          <p role="alert" className="mb-3 text-sm text-[#a23b2c]">
            {authError}
          </p>
        )}
        {ordersError && (
          <div role="alert" className="mb-3 rounded-[10px] bg-[#f8e9e6] px-4 py-3 text-sm text-[#a23b2c]">
            <p>{ordersError}</p>
            <button
              type="button"
              onClick={() => setOrdersReload((current) => current + 1)}
              className="mt-2 font-semibold underline"
            >
              Обновить список
            </button>
          </div>
        )}
        {activeTab === 'Профиль' && profileError && (
          <p role="alert" className="mb-3 rounded-[10px] bg-[#f8e9e6] px-4 py-3 text-sm text-[#a23b2c]">
            {profileError}
          </p>
        )}
        {ordersLoading ? (
          <p role="status" className="py-8 text-center text-sm text-[#6f6c64]">
            Загружаем заказы…
          </p>
        ) : activeTab === 'Лента' ? (
          <Feed orders={orders} userId={userId} onTakeOrder={takeOrder} notice={notice} />
        ) : activeTab === 'Разместить' ? (
          <PlaceOrder onPublish={publishOrder} />
        ) : activeTab === 'Мои заказы' ? (
          <MyOrders orders={orders} userId={userId} onStatusChange={changeOrderStatus} />
        ) : activeTab === 'Профиль' && profileLoading ? (
          <p role="status" className="py-8 text-center text-sm text-[#6f6c64]">
            Загружаем профиль…
          </p>
        ) : activeTab === 'Профиль' ? (
          <Profile
            profile={profile}
            orders={orders}
            userId={userId}
            onSave={saveUserProfile}
            onSignOut={signOut}
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
