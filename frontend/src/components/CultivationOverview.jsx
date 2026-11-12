import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppLink, { gardenEntryId, homeHref, seedbedEntryId } from './AppLink.jsx'
import CultivationForm, { GardenCreationForm, GardenField, QuantityField } from './CultivationForm.jsx'
import GardenCard from './GardenCard.jsx'
import SeedbedCard from './SeedbedCard.jsx'

export default function CultivationOverview({ page, inventory, onRetry, token, onSignOut, onChanged }) {
  const { t } = useTranslation()
  const [notice, setNotice] = useState(null)
  const { status, gardens, lots } = inventory
  const gardenView = page === 'gardens'
  const formId = gardenView ? gardenEntryId : seedbedEntryId
  const action = gardenView ? 'actions.addPlant' : 'flow.addSeedlings'

  useEffect(() => {
    if (status === 'ready' && window.location.hash === `#${formId}`) {
      document.getElementById(formId)?.focus()
    }
  }, [formId, status])

  function saved(result, message) {
    onChanged(result)
    setNotice(message)
  }

  return <div className="bank-page">
    <AppLink className="bank-button" href={homeHref}>← {t('actions.backToDashboard')}</AppLink>
    <div className="bank-grid">
      {gardenView ? <GardenCard gardens={gardens} status={status} onRetry={onRetry} full
        token={token} onSignOut={onSignOut} />
        : <SeedbedCard lots={lots} status={status} onRetry={onRetry} full />}
      {status === 'ready' && <section className="cultivation-card bank-panel" id={formId} tabIndex={-1} aria-labelledby="plant-entry-heading">
        <h2 id="plant-entry-heading">{t(action)}</h2>
        {notice && <p className="flow-notice" role="status">{t(notice)}</p>}
        {gardenView && !gardens.length ? <>
          <p className="flow-empty">{t('flow.gardenRequired')}</p>
          <GardenCreationForm token={token} onSignOut={onSignOut}
            onSaved={(garden) => saved({ garden }, 'flow.gardenCreated')} />
        </> : <CultivationForm token={token} onSignOut={onSignOut} action={action}
          path={gardenView ? '/crops/entry' : '/seedlings/entry'}
          payload={(fields) => ({
            name: fields.get('name').trim(),
            variety: fields.get('variety').trim() || null,
            quantity: Number(fields.get('quantity')),
            ...(gardenView ? { gardenId: Number(fields.get('gardenId')) } : {}),
          })}
          onSaved={(result) => saved(result, gardenView ? 'flow.gardenAdded' : 'flow.seedlingsAdded')}>
          <label>{t('seeds.cropName')}<input name="name" maxLength={100} required /></label>
          <label>{t('seeds.varietyOptional')}<input name="variety" maxLength={100} /></label>
          <QuantityField />
          {gardenView && <GardenField gardens={gardens} />}
        </CultivationForm>}
      </section>}
    </div>
  </div>
}
