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
  title: string
  business: string
  days: number
  skill: Skill
  description: string
  price: number
}

export interface MyOrder extends Order {
  id: string
  status: OrderStatus
  createdBy: string | null
  takenBy: string | null
  responsePrice?: number
  responseDays?: number
  message: string | null
  createdAt: string
}
