import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '../lib/api.js'

export default function LoginForm({ onLogin, expired, prompt, embedded = false }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const session = await apiRequest('/auth/login', {
        body: { email: fields.get('email').trim(), password: fields.get('password') },
      })
      onLogin(session)
    } catch (failure) {
      setError([400, 401].includes(failure.status) ? 'auth.invalid' : 'auth.unavailable')
    } finally {
      setBusy(false)
    }
  }

  return <section className="cultivation-card login-card" aria-labelledby="login-heading">
    {embedded ? <h3 id="login-heading">{t('auth.signIn')}</h3>
      : <h1 id="login-heading">{t('auth.signIn')}</h1>}
    <p>{t(expired ? 'auth.expired' : prompt)}</p>
    <form className="bank-form" onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        <label>{t('auth.email')}<input name="email" type="email" autoComplete="username" required /></label>
        <label>{t('auth.password')}<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="form-error" role="alert">{t(error)}</p>}
        <button type="submit" className="bank-button bank-button-primary">{t(busy ? 'auth.signingIn' : 'auth.signIn')}</button>
      </fieldset>
    </form>
  </section>
}
