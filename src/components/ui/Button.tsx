import { useLayoutEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  loadingLabel?: string
}

export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  loading = false,
  loadingLabel,
  children,
  ...props
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [buttonWidth, setButtonWidth] = useState<number>()

  useLayoutEffect(() => {
    if (!loading && buttonRef.current) setButtonWidth(buttonRef.current.offsetWidth)
  }, [children, loading])

  return (
    <button
      ref={buttonRef}
      {...props}
      type={type}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      aria-label={loading ? loadingLabel : props['aria-label']}
      style={{
        ...props.style,
        width: loading ? buttonWidth ?? props.style?.width : props.style?.width,
      }}
      className={`ui-button ui-button-${variant} ${loading ? 'ui-button-loading' : ''} ${className}`.trim()}
    >
      {loading ? (
        <span className="loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : children}
    </button>
  )
}
