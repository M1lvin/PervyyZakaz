import { useRef, useState, type FormEvent } from 'react'
import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import { Eye, EyeOff } from 'lucide-react'
import Button from './ui/Button'

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
  const [passwordError, setPasswordError] = useState('')
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
    if (!normalizedEmail) setEmailError('Введите email')
    if (!password) setPasswordError('Введите пароль')
    if (!normalizedEmail || !password) {
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setPasswordError('Пароль должен быть не короче 6 символов')
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
      setPasswordError('Пароль должен быть не короче 6 символов')
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
    setPasswordError('')
    setMessage('')
  }

  if (recoveryMode) {
    return (
      <div className="auth-main flex flex-1 items-center justify-center">
        <section className="ui-card w-full">
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
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'auth-password-error' : undefined}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setPasswordError('')
                  }}
                  className="ui-input pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="text-secondary absolute inset-y-0 right-0 flex w-11 items-center justify-center"
                >
                  {showPassword
                    ? <EyeOff aria-hidden="true" size={20} strokeWidth={1.75} />
                    : <Eye aria-hidden="true" size={20} strokeWidth={1.75} />}
                </button>
              </span>
              <span className={`input-error ${passwordError ? 'is-visible' : ''}`}>
                <span id="auth-password-error" role={passwordError ? 'alert' : undefined}>
                  {passwordError}
                </span>
              </span>
            </label>
            {error && (
              <p role="alert" className="text-error mb-3 text-sm">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              loadingLabel="Сохраняем пароль"
              className="w-full"
            >
              Сохранить пароль
            </Button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="auth-main flex flex-1 items-center justify-center">
      <section className="ui-card w-full">
        <h1 className="text-xl font-semibold tracking-tight">
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
              className="ui-input mt-1.5"
            />
            <span className={`input-error ${emailError ? 'is-visible' : ''}`}>
              <span id="auth-email-error" role={emailError ? 'alert' : undefined}>
                {emailError}
              </span>
            </span>
          </label>
          <label htmlFor="auth-password" className="text-secondary mb-3 block text-sm">
            Пароль
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? 'auth-password-error' : undefined}
              onChange={(event) => {
                setPassword(event.target.value)
                setPasswordError('')
              }}
              className="ui-input mt-1.5"
            />
            <span className={`input-error ${passwordError ? 'is-visible' : ''}`}>
              <span id="auth-password-error" role={passwordError ? 'alert' : undefined}>
                {passwordError}
              </span>
            </span>
          </label>

          {error && (
            <p role="alert" className="text-error mb-3 text-sm">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-secondary mb-3 text-sm">
              {message}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            loadingLabel={mode === 'signin' ? 'Выполняется вход' : 'Регистрация'}
            className="w-full"
          >
            {mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
          </Button>
          {mode === 'signin' && (
            <button
              type="button"
              disabled={loading || googleLoading}
              onClick={sendPasswordReset}
              className="text-primary mt-3 text-sm font-semibold underline"
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
        <Button
          type="button"
          disabled={loading || googleLoading}
          onClick={signInWithGoogle}
          variant="secondary"
          loading={googleLoading}
          loadingLabel="Выполняется вход через Google"
          className="w-full"
        >
          <span aria-hidden="true" className="google-mark">G</span>
          Войти через Google
        </Button>

        <p className="text-secondary mt-4 text-center text-sm">
          {mode === 'signin' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            type="button"
            onClick={() => changeMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-primary font-semibold underline"
          >
            {mode === 'signin' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </section>
    </div>
  )
}
