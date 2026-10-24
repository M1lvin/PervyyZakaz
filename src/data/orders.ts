export const skills = [
  'Сайты',
  'Боты',
  'Таблицы',
  'Дизайн',
  'Тексты',
  'Другое',
] as const

export type Skill = (typeof skills)[number]

export const orderStatuses = ['open', 'in_progress', 'done', 'paid'] as const

export type OrderStatus = (typeof orderStatuses)[number]

export interface Order {
  id: string
  title: string
  business: string
  days: number
  skill: Skill
  description: string
  price: number
}

export interface MyOrder extends Order {
  status: OrderStatus
  createdBy: string | null
  takenBy: string | null
  responsePrice?: number
  responseDays?: number
}

export interface OrderResponse {
  orderId: string
  price: number
  days: number
  message: string
  createdAt: string
}

export const orders: Order[] = [
  {
    id: 'cafe-menu',
    title: 'Страница с меню и ценами',
    business: 'Кофейня «Угол»',
    days: 5,
    skill: 'Сайты',
    description: 'Нужна простая страница с меню, ценами и адресом кофейни.',
    price: 1500,
  },
  {
    id: 'sales-table',
    title: 'Таблица учёта продаж',
    business: 'Магазин «Береке»',
    days: 3,
    skill: 'Таблицы',
    description: 'Собрать удобную таблицу для учёта ежедневных продаж и остатков.',
    price: 1000,
  },
  {
    id: 'social-banner',
    title: 'Баннер для соцсетей',
    business: 'Пекарня «Тёплый хлеб»',
    days: 2,
    skill: 'Дизайн',
    description: 'Подготовить яркий баннер для публикации о свежей выпечке.',
    price: 1200,
  },
]
