import type { HTMLAttributes } from 'react'
import type { OrderStatus } from '../../data/orders'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: OrderStatus
}

export default function Badge({ status, className = '', ...props }: BadgeProps) {
  const statusClass = status ? `ui-badge-status-${status}` : ''
  return <span {...props} className={`ui-badge ${statusClass} ${className}`.trim()} />
}
