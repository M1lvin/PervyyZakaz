import { useRef, useState, type FormEvent } from 'react'
import type { AuthError, SupabaseClient } from '@supabase/supabase-js'

interface AuthProps {
  client: SupabaseClient
  recoveryMode?: boolean
  onPasswordChanged?: () => void
}

type AuthMode = 'signin' | 'signup'

function translateAuthError(error: AuthError): string {
  const message = error.message.toLowerCase()

  if (message.includes('invalid login credentials')) {
    return 'Неверный email или пароль'
  }
  if (message.includes('email not confirmed')) {
    return 'Подтвердите email по ссылке из письма'
  }
  if (message.includes('user already registered')) {
    return 'Такой аккаунт уже есть, войдите'
  }
  if (message.includes('password should be at least')) {
    return 'Пароль должен быть не короче 6 символов'
  }
  if (message.includes('email address is invalid')) {
    return 'Проверьте правильность email'
  }
  if (message.includes('rate limit')) {
    return 'Слишком много попыток. Попробуйте позже'
  }
  if (message.includes('fetch')) {
    return 'Не удалось связаться с сервером. Проверьте подключение к интернету'
  }
  return 'Не удалось выполнить запрос. Проверьте данные и попробуйте ещё раз'
}

export default function Auth({
  client,
  recoveryMode = false,
  onPasswordChanged,
}: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const requestInProgress = useRef(false)
  const recoveryRequestInProgress = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (requestInProgress.current || googleLoading) return
    setError('')
    setMessage('')

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) {
      setError('Введите email и пароль')
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Пароль должен быть не короче 6 символов')
      return
    }

    requestInProgress.current = true
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await client.auth.signUp({
          email: normalizedEmail,
          password,
        })
        if (authError) {
          setError(translateAuthError(authError))
        } else if (!data.session) {
          setMessage('Проверьте почту и перейдите по ссылке для подтверждения email')
        }
      } else {
        const { error: authError } = await client.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (authError) setError(translateAuthError(authError))
      }
    } catch {
      setError('Не удалось связаться с сервером. Проверьте подключение к интернету')
    } finally {
      requestInProgress.current = false
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    if (requestInProgress.current || googleLoading) return
    setError('')
    setMessage('')
    setGoogleLoading(true)
    try {
      const { error: authError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (authError) setError(translateAuthError(authError))
    } catch {
      setError('Не удалось связаться с сервером. Проверьте подключение к интернету')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function sendPasswordReset() {
    if (requestInProgress.current || googleLoading) return
    setError('')
    setMessage('')
    setEmailError('')

    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setEmailError('Введите email')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Проверьте правильность email')
      return
    }

    requestInProgress.current = true
    setLoading(true)
    try {
      const { error: authError } = await client.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: window.location.origin,
      })
      if (authError) {
        setError(translateAuthError(authError))
      } else {
        setMessage('Письмо для сброса отправлено. Проверьте почту, включая папку «Спам».')
      }
    } catch {
      setError('Не удалось связаться с сервером. Проверьте подключение к интернету')
    } finally {
      requestInProgress.current = false
      setLoading(false)
    }
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (recoveryRequestInProgress.current) return
    setError('')
    setMessage('')
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов')
      return
    }

    recoveryRequestInProgress.current = true
    setLoading(true)
    try {
      const { error: authError } = await client.auth.updateUser({ password })
      if (authError) {
        setError(translateAuthError(authError))
      } else {
        onPasswordChanged?.()
      }
    } catch {
      setError('Не удалось связаться с сервером. Проверьте подключение к интернету')
    } finally {
      recoveryRequestInProgress.current = false
      setLoading(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setEmailError('')
    setMessage('')
  }

  if (recoveryMode) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <section className="card-background w-full max-w-[420px] rounded-xl border border-default p-5">
          <h1 className="text-[22px] font-semibold tracking-tight">Новый пароль</h1>
          <p className="text-secondary mt-1 text-sm">Первый заказ</p>

          <form className="mt-5" noValidate onSubmit={submitNewPassword}>
            <label htmlFor="auth-password" className="text-secondary mb-3 block text-sm">
              Пароль
              <span className="relative mt-1.5 block">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field-control min-h-11 w-full rounded-[10px] border px-3 py-2.5 pr-12 text-[15px]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="text-secondary absolute inset-y-0 right-0 flex w-11 items-center justify-center"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {showPassword ? (
                      <>
                        <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.3 2.2-2.5 3.3M6.2 6.2C3.9 7.7 2.7 9.7 2.5 12c.5 1.2 1.6 2.8 3.5 4.1A10.5 10.5 0 0 0 12 18c.8 0 1.5-.1 2.2-.3" />
                      </>
                    ) : (
                      <>
                        <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </span>
            </label>
            {error && (
              <p role="alert" className="text-error mb-3 text-sm">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="button-primary min-h-11 w-full rounded-[10px] px-4 py-2.5 disabled:opacity-60"
            >
              {loading ? 'Подождите...' : 'Сохранить пароль'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <section className="card-background w-full max-w-[420px] rounded-xl border border-default p-5">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {mode === 'signin' ? 'Вход' : 'Регистрация'}
        </h1>
        <p className="text-secondary mt-1 text-sm">Первый заказ</p>

        <form className="mt-5" noValidate onSubmit={submit}>
          <label htmlFor="auth-email" className="text-secondary mb-3 block text-sm">
            Email
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'auth-email-error' : undefined}
              onChange={(event) => {
                setEmail(event.target.value)
                setEmailError('')
              }}
              className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
            />
            {emailError && (
              <span id="auth-email-error" className="text-error mt-1 block text-sm">
                {emailError}
              </span>
            )}
          </label>
          <label htmlFor="auth-password" className="text-secondary mb-3 block text-sm">
            Пароль
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-control mt-1.5 min-h-11 w-full rounded-[10px] border px-3 py-2.5 text-[15px]"
            />
          </label>

          {error && (
            <p role="alert" className="text-error mb-3 text-sm">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-accent mb-3 text-sm">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="button-primary min-h-11 w-full rounded-[10px] px-4 py-2.5 disabled:opacity-60"
          >
            {loading ? 'Подождите...' : mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
          </button>
          {mode === 'signin' && (
            <button
              type="button"
              disabled={loading || googleLoading}
              onClick={sendPasswordReset}
              className="text-accent mt-3 text-sm font-semibold underline disabled:opacity-60"
            >
              Забыли пароль?
            </button>
          )}
        </form>

        <div className="text-secondary my-4 flex items-center gap-3 text-sm">
          <span className="bg-border h-px flex-1" />
          <span>или</span>
          <span className="bg-border h-px flex-1" />
        </div>
        <button
          type="button"
          disabled={loading || googleLoading}
          onClick={signInWithGoogle}
          className="button-secondary flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 disabled:opacity-60"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 32 15.1l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 32 15.1l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
            <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.8 28l-6.5 5A20 20 0 0 0 24 44Z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2A20 20 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
          </svg>
          {googleLoading ? 'Подождите...' : 'Войти через Google'}
        </button>

        <p className="text-secondary mt-4 text-center text-sm">
          {mode === 'signin' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            type="button"
            onClick={() => changeMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-accent font-semibold underline"
          >
            {mode === 'signin' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </section>
    </main>
  )
}
