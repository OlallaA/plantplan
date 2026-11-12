import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '../lib/api.js'

function focusField(element) {
  element?.focus()
}

export default function QuantityEditor({ path, quantity, quantityLabel, token, disabled, onBusyChange,
  onSignOut, onChanged }) {
  const { t } = useTranslation()
  const [edit, setEdit] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [saving, setSaving] = useState(false)
  const countLabel = (count) => t(quantityLabel, { count })

  function review(event) {
    event.preventDefault()
    if (disabled) return
    if (edit.before !== quantity) {
      setEdit(null)
      setFeedback('flow.quantityChanged')
      return
    }
    const after = Number(edit.value)
    if (edit.value === '' || !Number.isInteger(after) || after < 0 || after >= edit.before) {
      setFeedback('flow.quantityInvalid')
      return
    }
    setFeedback(null)
    setEdit({ ...edit, after })
  }

  async function confirm() {
    if (disabled) return
    setSaving(true)
    onBusyChange(true)
    setFeedback(null)
    try {
      const record = await apiRequest(path + '/quantity', {
        token,
        method: 'PUT',
        body: { expectedQuantity: edit.before, quantity: edit.after },
      })
      onChanged(record)
      setEdit(null)
      setFeedback('flow.quantitySaved')
    } catch (failure) {
      if (failure.status === 401) onSignOut(true, token)
      else if (failure.status === 409) {
        try {
          onChanged(await apiRequest(path, { token }))
          setEdit(null)
          setFeedback('flow.quantityChanged')
        } catch (refreshFailure) {
          if (refreshFailure.status === 401) onSignOut(true, token)
          else setFeedback('flow.quantityRefreshError')
        }
      } else setFeedback('flow.quantitySaveError')
    } finally {
      onBusyChange(false)
      setSaving(false)
    }
  }

  return <div className="quantity-editor" aria-busy={saving}>
    {edit === null ? <div className="quantity-line">
      <strong>{countLabel(quantity)}</strong>
      {quantity > 0 && <button type="button" className="bank-button quantity-edit-button" disabled={disabled}
        onClick={() => {
          setEdit({ before: quantity, value: String(quantity) })
          setFeedback(null)
        }}>{t('flow.editQuantity')}</button>}
    </div> : edit.after === undefined ? <form className="quantity-form" onSubmit={review} noValidate>
      <label>{t('flow.newQuantity')}
        <input type="number" min="0" max={edit.before - 1} step="1" value={edit.value} disabled={disabled}
          ref={focusField}
          onChange={(event) => setEdit({ ...edit, value: event.target.value })} />
      </label>
      <div className="quantity-buttons">
        <button type="submit" className="bank-button bank-button-primary" disabled={disabled}>{t('flow.reviewQuantity')}</button>
        <button type="button" className="bank-button" disabled={disabled} onClick={() => {
          setEdit(null)
          setFeedback(null)
        }}>{t('flow.cancelQuantity')}</button>
      </div>
    </form> : <div className="quantity-review">
      <p role="status">
        <strong>{countLabel(edit.before)} → {countLabel(edit.after)}</strong>
        <span>{t('flow.quantityDeduction', {
          count: edit.before - edit.after, quantity: countLabel(edit.before - edit.after),
        })}</span>
      </p>
      <div className="quantity-buttons">
        <button type="button" className="bank-button bank-button-primary" disabled={disabled} ref={focusField}
          onClick={confirm}>{t(saving ? 'actions.saving' : 'flow.confirmQuantity')}</button>
        <button type="button" className="bank-button" disabled={disabled} onClick={() => {
          setEdit({ before: edit.before, value: edit.value })
          setFeedback(null)
        }}>{t('flow.backToQuantity')}</button>
      </div>
    </div>}
    {feedback && <p className="quantity-feedback" role="status">{t(feedback, { max: (edit?.before ?? quantity) - 1 })}</p>}
  </div>
}
