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
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm text-secondary">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`ui-input w-full ${className}`.trim()}
      />
      {error && (
        <span id={errorId} className="text-error mt-1 block text-sm">
          {error}
        </span>
      )}
    </div>
  )
}
