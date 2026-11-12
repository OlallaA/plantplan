import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '../lib/api.js'
import AppLink, { homeHref } from './AppLink.jsx'
import { SeedInventoryMessage, SeedPacket } from './SeedBankCard.jsx'

export default function SeedBankPage({ inventory, onRetry, token, onSignOut, onStockSaved }) {
  const { t } = useTranslation()
  const { seeds, status } = inventory

  return <div className="bank-page">
    <AppLink className="bank-button" href={homeHref}>← {t('actions.backToDashboard')}</AppLink>
    <div className="bank-grid">
      <section className="cultivation-card bank-panel" aria-labelledby="bank-heading">
        <div className="card-heading">
          <h1 id="bank-heading">{t('seeds.heading')}</h1>
          {status === 'ready' && <span className="count-badge">{t('seeds.records', { count: seeds.length })}</span>}
        </div>
        {seeds.length ? <ul className="wood-cabinet full-seed-list">
          {seeds.map((seed) => <li key={seed.id}>
            <SeedPacket seed={seed} />
            {seed.notes && <p className="seed-notes">{seed.notes}</p>}
          </li>)}
        </ul> : <SeedInventoryMessage status={status} onRetry={onRetry} />}
      </section>
      {status === 'ready' && <section className="cultivation-card bank-panel" id="engadir-sementes" tabIndex={-1} aria-labelledby="add-seed-heading">
        <h2 id="add-seed-heading">{t('actions.addSeeds')}</h2>
        <SeedForm token={token} onSignOut={onSignOut} onStockSaved={onStockSaved} />
      </section>}
    </div>
  </div>
}

function SeedForm({ token, onSignOut, onStockSaved }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const name = fields.get('name').trim()
    setSaved(false)
    if (!name) {
      setError('seeds.nameRequired')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await apiRequest('/seeds/stock', {
        token,
        body: {
          name,
          variety: fields.get('variety').trim() || null,
          quantity: Number(fields.get('quantity')),
          notes: fields.get('notes').trim() || null,
        },
      })
      onStockSaved(result)
      form.reset()
      setSaved(true)
    } catch (failure) {
      if (failure.status === 401) onSignOut(true, token)
      else setError('seeds.saveError')
    } finally {
      setBusy(false)
    }
  }

  return <form className="bank-form" onSubmit={submit} aria-busy={busy}>
    <fieldset disabled={busy}>
      <label>{t('seeds.cropName')}<input name="name" maxLength={100} required /></label>
      <label>{t('seeds.varietyOptional')}<input name="variety" maxLength={100} /></label>
      <label>{t('seeds.quantityLabel')}<input name="quantity" type="number" min="1" max="2147483647" step="1" required /></label>
      <label>{t('seeds.notesOptional')}<textarea name="notes" rows="2" /></label>
      {error && <p className="form-error" role="alert">{t(error)}</p>}
      {saved && <p role="status">{t('seeds.saved')}</p>}
      <button type="submit" className="bank-button bank-button-primary">{t(busy ? 'actions.saving' : 'seeds.save')}</button>
    </fieldset>
  </form>
}
