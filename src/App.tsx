import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LayoutList, Package, PlusCircle, User } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import Auth from './components/Auth'
import Feed from './components/Feed'
import MyOrders from './components/MyOrders'
import PlaceOrder from './components/PlaceOrder'
import Profile, { FirstOrderStamp, type UserProfile } from './components/Profile'
import Button from './components/ui/Button'
import Card from './components/ui/Card'
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
const tabIcons = {
  Лента: LayoutList,
  Разместить: PlusCircle,
  'Мои заказы': Package,
  Профиль: User,
} as const

type Tab = (typeof tabs)[number]
type Theme = 'light' | 'dark' | 'system'
type ProfilePage = 'profile' | 'settings'

const emptyProfile: UserProfile = { name: '', contact: '', skills: [] }

function initialTheme(): Theme {
  const theme = document.documentElement.dataset.theme
  return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system'
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Лента')
  const [profilePage, setProfilePage] = useState<ProfilePage>('profile')
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [profile, setProfile] = useState<UserProfile>(emptyProfile)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [passwordChangedNotice, setPasswordChangedNotice] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [navKeyboardOpen, setNavKeyboardOpen] = useState(false)
  const [stampReceived, setStampReceived] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [ordersReload, setOrdersReload] = useState(0)
  const userId = session?.user.id ?? ''
  const reducedMotion = useReducedMotion()

  function changeTheme(nextTheme: Theme) {
    localStorage.setItem('theme', nextTheme)
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }

  useEffect(() => {
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!themeColor) return

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
    const updateThemeColor = () => {
      themeColor.content = getComputedStyle(document.documentElement)
        .getPropertyValue('--page-bg')
        .trim()
    }

    updateThemeColor()
    if (theme !== 'system') return

    systemTheme.addEventListener('change', updateThemeColor)
    return () => systemTheme.removeEventListener('change', updateThemeColor)
  }, [theme])

  useEffect(() => {
    const isInput = (target: EventTarget | null) =>
      target instanceof HTMLElement && target.matches('input, textarea, select')
    const updateKeyboardState = (target: EventTarget | null) => {
      setNavKeyboardOpen(window.innerWidth >= 768 && isInput(target))
    }
    const handleFocusIn = (event: FocusEvent) => updateKeyboardState(event.target)
    const handleFocusOut = (event: FocusEvent) => updateKeyboardState(event.relatedTarget)
    const handleResize = () => updateKeyboardState(document.activeElement)

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!stampReceived) return
    const timeout = window.setTimeout(() => setStampReceived(false), 360)
    return () => window.clearTimeout(timeout)
  }, [stampReceived])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    let active = true
    let authStateChanged = false
    const client = supabase
    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      authStateChanged = true
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      } else if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false)
        setPasswordChangedNotice(false)
      }
      setAuthError('')
      setAuthLoading(false)
    })

    client.auth.getSession().then(({ data, error }) => {
      if (!active || authStateChanged) return
      if (error) {
        setAuthError('Не удалось проверить вход. Обновите страницу и попробуйте ещё раз')
      } else {
        setSession(data.session)
      }
      setAuthLoading(false)
    }).catch(() => {
      if (!active || authStateChanged) return
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
      if (status === 'paid') setStampReceived(true)
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
      <div className="app-shell">
        <header className="hero"><h1>Первый заказ</h1></header>
        <main className="app-sheet">
          <p role="alert" className="ui-card text-error">
            Для входа настройте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в файле .env
          </p>
        </main>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <header className="hero"><h1>Первый заказ</h1></header>
        <main className="app-sheet" aria-label="Загрузка">
          <div className="loading-skeleton" aria-hidden="true">
            <div className="skeleton-block" />
            <div className="skeleton-block" />
            <div className="skeleton-block" />
          </div>
        </main>
      </div>
    )
  }

  if (!session || passwordRecovery) {
    return (
      <div className="app-shell">
        <header className="hero">
          <h1>Первый заказ</h1>
          <p>Задачи от местного бизнеса для студентов</p>
        </header>
        <main className="app-sheet">
          {authError && <p role="alert" className="feedback-error mb-3 rounded-[14px] px-4 py-3">{authError}</p>}
          {passwordChangedNotice && <p role="status" className="feedback-success mb-3 rounded-[14px] px-4 py-3">Пароль изменён</p>}
          <Auth
            client={supabase}
            recoveryMode={passwordRecovery}
            onPasswordChanged={() => {
              setPasswordRecovery(false)
              setPasswordChangedNotice(true)
            }}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1>{activeTab === 'Профиль' && profilePage === 'settings' ? 'Настройки' : activeTab}</h1>
            <p>
              Задачи от местного бизнеса для студентов
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {orders.some((order) => order.takenBy === userId && order.status === 'paid') && (
              <FirstOrderStamp earned small animate={stampReceived} />
            )}
          </div>
        </div>
      </header>

      <main className={`app-sheet ${stampReceived ? 'stamp-received' : ''}`}>
        {authError && (
          <p role="alert" className="mb-3 text-sm text-error">
            {authError}
          </p>
        )}
        {passwordChangedNotice && (
          <p role="status" className="mb-3 text-sm text-secondary">
            Пароль изменён
          </p>
        )}
        {ordersError && (
          <div role="alert" className="feedback-error mb-3 rounded-[10px] px-4 py-3 text-sm">
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
          <p role="alert" className="feedback-error mb-3 rounded-[10px] px-4 py-3 text-sm">
            {profileError}
          </p>
        )}
        <div key={`${activeTab}-${profilePage}`} className="screen-enter">
          {ordersLoading ? (
            <div className="loading-skeleton" role="status" aria-label="Загружаем заказы">
              <div className="skeleton-block" />
              <div className="skeleton-block" />
              <div className="skeleton-block" />
            </div>
          ) : activeTab === 'Лента' ? (
            <Feed
              orders={orders}
              userId={userId}
              onTakeOrder={takeOrder}
              onPlaceOrder={() => setActiveTab('Разместить')}
              notice={notice}
            />
          ) : activeTab === 'Разместить' ? (
            <PlaceOrder onPublish={publishOrder} />
          ) : activeTab === 'Мои заказы' ? (
            <MyOrders
              orders={orders}
              userId={userId}
              onStatusChange={changeOrderStatus}
              onNavigateToFeed={() => setActiveTab('Лента')}
            />
          ) : activeTab === 'Профиль' && profileLoading ? (
            <div className="loading-skeleton" role="status" aria-label="Загружаем профиль">
              <div className="skeleton-block" />
              <div className="skeleton-block" />
              <div className="skeleton-block" />
            </div>
          ) : activeTab === 'Профиль' && profilePage === 'settings' ? (
            <section aria-label="Настройки">
              <div className="mb-4 flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => setProfilePage('profile')}
                  variant="secondary"
                  className="text-sm"
                >
                  ← Назад
                </Button>
                <h2 className="text-xl font-semibold tracking-tight">Настройки</h2>
              </div>
              {[
                {
                  title: 'Тема',
                  content: (
                    <div className="theme-picker" role="radiogroup" aria-label="Тема оформления">
                      {([
                        ['light', 'Светлая'],
                        ['dark', 'Тёмная'],
                        ['system', 'Как в системе'],
                      ] as const).map(([value, label]) => (
                        <label
                          key={value}
                          className={`theme-segment ${
                            theme === value ? 'is-selected' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="theme"
                            value={value}
                            checked={theme === value}
                            onChange={() => changeTheme(value)}
                            className="sr-only"
                          />
                          {theme === value && (
                            <motion.span
                              layoutId={reducedMotion ? undefined : 'active-theme-segment'}
                              className="theme-segment-indicator"
                              transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                            />
                          )}
                          {label}
                        </label>
                      ))}
                    </div>
                  ),
                },
                {
                  title: 'Язык',
                  content: <p className="text-secondary text-sm">Скоро</p>,
                },
              ].map((section) => (
                <Card
                  as="section"
                  key={section.title}
                  className="mb-3 p-4"
                >
                  <h3 className="mb-3 text-base font-semibold">{section.title}</h3>
                  {section.content}
                </Card>
              ))}
            </section>
          ) : activeTab === 'Профиль' ? (
            <Profile
              profile={profile}
              orders={orders}
              userId={userId}
              onOpenSettings={() => setProfilePage('settings')}
              onSave={saveUserProfile}
              onSignOut={signOut}
              animateStamp={stampReceived}
            />
          ) : (
            <h2 className="text-base font-semibold">{activeTab}</h2>
          )}
        </div>
      </main>

      <nav aria-label="Разделы" className={`app-nav ${navKeyboardOpen ? 'is-keyboard-open' : ''}`}>
        {tabs.map((tab) => {
          const Icon = tabIcons[tab]
          return (
            <button
              key={tab}
              type="button"
              aria-current={activeTab === tab ? 'page' : undefined}
              aria-label={tab}
              onClick={() => {
                setNotice(null)
                if (tab === 'Профиль') setProfilePage('profile')
                setActiveTab(tab)
              }}
            >
              {activeTab === tab && (
                <motion.span
                  layoutId={reducedMotion ? undefined : 'active-navigation-indicator'}
                  className="app-nav-indicator"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                />
              )}
              <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
            </button>
          )
        })}
      </nav>
    </div>
  )
}
