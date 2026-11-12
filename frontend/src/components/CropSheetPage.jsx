import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '../lib/api.js'
import AppLink, { homeHref, seedBankHref } from './AppLink.jsx'
import CultivationActions from './CultivationActions.jsx'
import CatalogIcon, { hasCatalogIcon } from './CatalogIcon.jsx'

const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
const periods = [
  ['sowing', 'sowingStartMonth', 'sowingEndMonth'],
  ['transplant', 'transplantStartMonth', 'transplantEndMonth'],
  ['harvest', 'harvestStartMonth', 'harvestEndMonth'],
]
const exposures = ['FULL_SUN', 'PARTIAL_SUN', 'PARTIAL_SHADE', 'SHADE']

function monthName(value) {
  return typeof value === 'number' ? months[value - 1] : value
}

function editableValues(sheet) {
  const calendar = Object.fromEntries(periods.flatMap(([, start, end]) => [
    [start, monthName(sheet[start]) || null], [end, monthName(sheet[end]) || null],
  ]))
  return {
    name: sheet.name.trim(),
    variety: sheet.variety?.trim() || null,
    wateringFrequencyDays: Number(sheet.wateringFrequencyDays) || null,
    sunExposure: sheet.sunExposure || null,
    notes: sheet.notes?.trim() || null,
    ...calendar,
  }
}

export default function CropSheetPage({ sheet, status, token, onSignOut, onRetry, onSaved,
  stock, seeds, lots, crops, gardens, onCultivationChange }) {
  const { t } = useTranslation()
  return <div className="bank-page">
    <div className="sheet-nav">
      <AppLink className="bank-button" href={seedBankHref}>← {t('sheet.backToBank')}</AppLink>
      <AppLink className="bank-button" href={homeHref}>{t('actions.backToDashboard')}</AppLink>
    </div>
    <section className="cultivation-card bank-panel sheet-panel" aria-labelledby="sheet-heading">
      <h1 id="sheet-heading">{t('sheet.heading')}</h1>
      {status === 'loading' ? <p className="empty-state" role="status">{t('sheet.loading')}</p>
        : status === 'error' ? <div className="empty-state">
          <p role="alert">{t('sheet.loadError')}</p>
          <button type="button" className="bank-button" onClick={onRetry}>{t('actions.retry')}</button>
        </div> : sheet ? <>
          <div className="sheet-summary">
            {hasCatalogIcon(sheet.catalogIconId) && <CatalogIcon crop={sheet.catalogIconId} />}
            <p className="sheet-name">{sheet.name}{sheet.variety && ` · ${sheet.variety}`}</p>
            <span className="count-badge">
              {stock === 0 ? t('sheet.noSeeds') : t('seeds.quantity', { count: stock })}
            </span>
          </div>
          {sheet.waterMin != null && <p className="catalog-water">
            {t('catalog.water')}{' · '}{t('catalog.amount', { min: sheet.waterMin, max: sheet.waterMax,
              context: sheet.waterMin === sheet.waterMax ? 'single' : undefined })}
            {sheet.wateringGeneral && ` · ${t('catalog.generalEstimate')}`}
          </p>}
          <CultivationActions sheetId={sheet.id} stock={stock} seeds={seeds} lots={lots} crops={crops} gardens={gardens}
            token={token} onSignOut={onSignOut} onChanged={onCultivationChange} />
          <h2 className="sheet-details-heading">{t('flow.editSheet')}</h2>
          <CropSheetForm sheet={sheet} token={token} onSignOut={onSignOut} onSaved={onSaved} />
        </>
          : <p className="empty-state" role="alert">{t('sheet.unavailable')}</p>}
    </section>
  </div>
}

function CropSheetForm({ sheet, token, onSignOut, onSaved }) {
  const { t, i18n } = useTranslation()
  const [draft, setDraft] = useState(sheet)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const monthFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: 'long', timeZone: 'UTC' })
  const values = editableValues(draft)
  const original = editableValues(sheet)
  const hasChanges = Object.keys(values).some((name) => values[name] !== original[name])

  function field(name, currentValue = draft[name]) {
    return {
      value: currentValue ?? '',
      onChange: (event) => {
        const value = event.target.value
        setDraft((current) => ({ ...current, [name]: value }))
        setError(null)
        setSaved(false)
      },
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (busy || !hasChanges) return
    setSaved(false)
    if (!values.name) {
      setError('seeds.nameRequired')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const updated = await apiRequest(`/crop-sheets/${sheet.id}`, {
        token,
        method: 'PUT',
        body: values,
      })
      setDraft(updated)
      onSaved(updated)
      setSaved(true)
    } catch (failure) {
      if (failure.status === 401) onSignOut(true, token)
      else setError(failure.status === 409 ? 'sheet.duplicate' : 'sheet.saveError')
    } finally {
      setBusy(false)
    }
  }

  return <form className="bank-form" onSubmit={submit} aria-busy={busy}>
    <fieldset disabled={busy}>
      <div className="sheet-fields">
        <label>{t('seeds.cropName')}<input {...field('name')} maxLength={100} required /></label>
        <label>{t('seeds.varietyOptional')}<input {...field('variety')} maxLength={100} /></label>
        <label>{t('sheet.wateringDays')}<input {...field('wateringFrequencyDays')} type="number" min="1" max="2147483647" step="1" /></label>
        <label>{t('sheet.sunExposure')}
          <select {...field('sunExposure')}>
            <option value="">{t('sheet.unspecified')}</option>
            {exposures.map((value) => <option key={value} value={value}>{t(`sheet.exposures.${value}`)}</option>)}
          </select>
        </label>
      </div>
      <div className="sheet-periods">
        {periods.map(([period, start, end]) => <fieldset className="sheet-period" key={period}>
          <legend>{t(`sheet.${period}`)}</legend>
          {[start, end].map((name) => <label key={name}>{t(name === start ? 'sheet.start' : 'sheet.end')}
            <select {...field(name, monthName(draft[name]))}>
              <option value="">{t('sheet.unspecified')}</option>
              {months.map((month, index) => <option key={month} value={month}>{monthFormat.format(new Date(Date.UTC(2026, index, 1)))}</option>)}
            </select>
          </label>)}
        </fieldset>)}
      </div>
      <label>{t('seeds.notesOptional')}<textarea {...field('notes')} rows="3" /></label>
      {error && <p className="form-error" role="alert">{t(error)}</p>}
      {saved && <p role="status">{t('sheet.saved')}</p>}
      <button type="submit" disabled={busy || !hasChanges} className="bank-button bank-button-primary">
        {t(busy ? 'actions.saving' : 'sheet.save')}
      </button>
    </fieldset>
  </form>
}
