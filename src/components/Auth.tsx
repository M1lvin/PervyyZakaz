import { useRef, useState, type FormEvent } from 'react'
import type { AuthError, SupabaseClient } from '@supabase/supabase-js'

interface AuthProps {
  client: SupabaseClient
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

export default function Auth({ client }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const requestInProgress = useRef(false)

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

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <section className="w-full max-w-[420px] rounded-xl border border-[#e3e0d7] bg-white p-5">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {mode === 'signin' ? 'Вход' : 'Регистрация'}
        </h1>
        <p className="mt-1 text-sm text-[#6f6c64]">Первый заказ</p>

        <form className="mt-5" noValidate onSubmit={submit}>
          <label htmlFor="auth-email" className="mb-3 block text-sm text-[#6f6c64]">
            Email
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-[10px] border border-[#e3e0d7] bg-white px-3 py-2.5 text-[15px] text-[#1d1c19]"
            />
          </label>
          <label htmlFor="auth-password" className="mb-3 block text-sm text-[#6f6c64]">
            Пароль
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-[10px] border border-[#e3e0d7] bg-white px-3 py-2.5 text-[15px] text-[#1d1c19]"
            />
          </label>

          {error && (
            <p role="alert" className="mb-3 text-sm text-[#a23b2c]">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="mb-3 text-sm text-[#1f6f5c]">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="button-primary min-h-11 w-full rounded-[10px] border border-[#1f6f5c] bg-[#1f6f5c] px-4 py-2.5 text-white disabled:opacity-60"
          >
            {loading ? 'Подождите...' : mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-sm text-[#6f6c64]">
          <span className="h-px flex-1 bg-[#e3e0d7]" />
          <span>или</span>
          <span className="h-px flex-1 bg-[#e3e0d7]" />
        </div>
        <button
          type="button"
          disabled={loading || googleLoading}
          onClick={signInWithGoogle}
          className="button-secondary flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#e3e0d7] bg-white px-4 py-2.5 text-[#1d1c19] disabled:opacity-60"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 32 15.1l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 32 15.1l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
            <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.8 28l-6.5 5A20 20 0 0 0 24 44Z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2A20 20 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
          </svg>
          {googleLoading ? 'Подождите...' : 'Войти через Google'}
        </button>

        <p className="mt-4 text-center text-sm text-[#6f6c64]">
          {mode === 'signin' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            type="button"
            onClick={() => changeMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-semibold text-[#1f6f5c] underline"
          >
            {mode === 'signin' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </section>
    </main>
  )
}
