import type { SupabaseClient } from '@supabase/supabase-js'
import { orderStatuses, skills, type MyOrder, type Order, type OrderStatus, type Skill } from '../data/orders'

interface OrderRow {
  id: string
  title: string
  description: string
  budget: number
  days: number
  skill: string
  business: string
  status: string
  owner_id: string
  taker_id: string | null
  price: number | null
  taken_days: number | null
  message: string | null
  created_at: string
}

function isSkill(value: string): value is Skill {
  return skills.some((skill) => skill === value)
}

function isOrderStatus(value: string): value is OrderStatus {
  return orderStatuses.some((status) => status === value)
}

function toMyOrder(row: OrderRow): MyOrder {
  if (!isSkill(row.skill) || !isOrderStatus(row.status)) {
    throw new Error('Заказ содержит неизвестный навык или статус.')
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.budget,
    days: row.days,
    skill: row.skill,
    business: row.business,
    status: row.status,
    createdBy: row.owner_id,
    takenBy: row.taker_id,
    responsePrice: row.price ?? undefined,
    responseDays: row.taken_days ?? undefined,
    message: row.message,
    createdAt: row.created_at,
  }
}

export async function loadOrders(client: SupabaseClient): Promise<MyOrder[]> {
  const { data, error } = await client
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as OrderRow[]).map(toMyOrder)
}

export async function createOrder(
  client: SupabaseClient,
  order: Order,
  ownerId: string,
): Promise<MyOrder> {
  const { data, error } = await client
    .from('orders')
    .insert({
      title: order.title,
      description: order.description,
      budget: order.price,
      days: order.days,
      skill: order.skill,
      business: order.business,
      status: 'open',
      owner_id: ownerId,
    })
    .select('*')
    .single()

  if (error) throw error
  return toMyOrder(data as OrderRow)
}

export async function takeOrder(
  client: SupabaseClient,
  orderId: string,
  takerId: string,
  price: number,
  days: number,
  message: string,
): Promise<MyOrder> {
  const { data, error } = await client
    .from('orders')
    .update({
      status: 'in_progress',
      taker_id: takerId,
      price,
      taken_days: days,
      message,
    })
    .eq('id', orderId)
    .eq('status', 'open')
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Этот заказ уже недоступен. Обновите ленту.')
  return toMyOrder(data as OrderRow)
}

export async function updateOrderStatus(
  client: SupabaseClient,
  orderId: string,
  userId: string,
  status: 'done' | 'paid',
): Promise<MyOrder> {
  let query = client
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (status === 'done') {
    query = query.eq('taker_id', userId).eq('status', 'in_progress')
  } else {
    query = query.eq('owner_id', userId).eq('status', 'done')
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Не удалось изменить статус заказа. Проверьте права или обновите список.')
  return toMyOrder(data as OrderRow)
}

export function orderErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const details = error as { code?: unknown; status?: unknown; message?: unknown }
    const code = typeof details.code === 'string' ? details.code : ''
    const status = details.status
    const message = typeof details.message === 'string' ? details.message.toLowerCase() : ''

    if (
      code === '42501' ||
      status === 401 ||
      status === 403 ||
      /permission|row-level security|not authorized|forbidden/.test(message)
    ) {
      return 'Недостаточно прав для этого действия. Проверьте доступ к заказу.'
    }
    if (/fetch|network|failed to connect|load failed/.test(message)) {
      return 'Не удалось связаться с сервером. Проверьте подключение к интернету.'
    }
  }

  if (error instanceof Error && /заказ уже недоступен|проверьте права/i.test(error.message)) {
    return error.message
  }

  return 'Не удалось выполнить операцию с заказом. Попробуйте ещё раз.'
}
