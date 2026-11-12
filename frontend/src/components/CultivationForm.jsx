import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '../lib/api.js'

export default function CultivationForm({ token, onSignOut, path, action, conflict, payload, onSaved, children,
  disabled = false, onBusyChange }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(event) {
    event.preventDefault()
    if (busy || disabled) return
    const form = event.currentTarget
    const body = payload(new FormData(form))
    setBusy(true)
    onBusyChange?.(true)
    setError(null)
    try {
      const result = await apiRequest(path, { token, body })
      form.reset()
      onSaved(result)
    } catch (failure) {
      if (failure.status === 401) onSignOut(true, token)
      else setError(failure.status === 409 && conflict ? conflict : 'flow.saveError')
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }

  return <form className="bank-form" onSubmit={submit} aria-busy={busy}>
    <fieldset disabled={busy || disabled}>
      {children}
      {error && <p className="form-error" role="alert">{t(error)}</p>}
      <button type="submit" className="bank-button bank-button-primary">{t(busy ? 'actions.saving' : action)}</button>
    </fieldset>
  </form>
}

export function QuantityField({ label = 'flow.plantQuantity', max = 2147483647 }) {
  const { t } = useTranslation()
  return <label>{t(label)}<input name="quantity" type="number" min="1" max={max} step="1" required /></label>
}

export function GardenField({ gardens }) {
  const { t } = useTranslation()
  return <label>{t('flow.destination')}
    <select name="gardenId" defaultValue={gardens.length === 1 ? gardens[0].id : ''} required>
      <option value="" disabled>{t('flow.chooseGarden')}</option>
      {gardens.map((garden) => <option key={garden.id} value={garden.id}>{garden.name}</option>)}
    </select>
  </label>
}

export function GardenCreationForm({ onSaved, ...requestProps }) {
  const { t } = useTranslation()
  return <CultivationForm {...requestProps} path="/gardens" action="actions.createGarden"
    payload={(fields) => ({ name: fields.get('name').trim() })} onSaved={onSaved}>
    <label>{t('flow.gardenName')}<input name="name" maxLength={100} required /></label>
  </CultivationForm>
}
