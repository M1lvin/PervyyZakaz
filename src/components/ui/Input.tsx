import { useId, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function Input({ label, error, id, className = '', ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className={className}>
      <label htmlFor={inputId} className="ui-input-label">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className="ui-input"
      />
      <span className={`input-error ${error ? 'is-visible' : ''}`}>
        <span id={errorId} role={error ? 'alert' : undefined}>
          {error ?? ''}
        </span>
      </span>
    </div>
  )
}
