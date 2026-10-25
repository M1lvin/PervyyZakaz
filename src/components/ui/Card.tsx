import type { ElementType, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  noValidate?: boolean
}

export default function Card({
  as: Component = 'div',
  className = '',
  ...props
}: CardProps) {
  return <Component {...props} className={`ui-card ${className}`.trim()} />
}
