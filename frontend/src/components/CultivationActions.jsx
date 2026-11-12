import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CultivationForm, { GardenCreationForm, GardenField, QuantityField } from './CultivationForm.jsx'
import LotDate from './LotDate.jsx'
import QuantityEditor from './QuantityEditor.jsx'

function today() {
  const date = new Date()
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0')).join('-')
}

export default function CultivationActions({ sheetId, stock, seeds, lots, crops, gardens, token, onSignOut, onChanged }) {
  const { t, i18n } = useTranslation()
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const requestProps = { token, onSignOut, disabled: saving, onBusyChange: setSaving }
  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeZone: 'UTC' })

  function saved(result, message) {
    onChanged(result)
    setNotice(message)
  }

  return <section className="cultivation-flow" aria-labelledby="cultivation-flow-heading">
    <h2 id="cultivation-flow-heading">{t('flow.heading')}</h2>
    {notice && <p className="flow-notice" role="status">{t(notice)}</p>}
    <div className="flow-actions">
      <details className="flow-card">
        <summary>{t('actions.addSeeds')}</summary>
        <p>{t('flow.stock', { count: stock })}</p>
        <CultivationForm {...requestProps} path={`/crop-sheets/${sheetId}/seeds/stock`}
          action="actions.addSeeds"
          payload={(fields) => ({ quantity: Number(fields.get('quantity')) })}
          onSaved={(seed) => saved({ seeds: [seed] }, 'seeds.saved')}>
          <QuantityField label="seeds.quantityLabel" />
        </CultivationForm>
      </details>
      <details className="flow-card">
        <summary>{t('flow.sow')}</summary>
        <p>{t('flow.stock', { count: stock })}</p>
        {stock > 0 && <CultivationForm {...requestProps} path={`/crop-sheets/${sheetId}/sow`}
          action="flow.sow" conflict="flow.stockChanged"
          payload={(fields) => ({ quantity: Number(fields.get('quantity')) })}
          onSaved={(result) => saved(result, 'flow.sown')}>
          <QuantityField label="seeds.quantityLabel" max={Math.min(stock, 2147483647)} />
        </CultivationForm>}
      </details>
      <details className="flow-card">
        <summary>{t('flow.addSeedlings')}</summary>
        <CultivationForm {...requestProps} path="/seedlings" action="flow.addSeedlings"
          payload={(fields) => ({ cropSheetId: sheetId, sownQuantity: Number(fields.get('quantity')) })}
          onSaved={(seedling) => saved({ seedling }, 'flow.seedlingsAdded')}>
          <QuantityField label="flow.plantQuantity" />
        </CultivationForm>
      </details>
      <details className="flow-card">
        <summary>{t('flow.addToGarden')}</summary>
        {gardens.length ? <CultivationForm {...requestProps} path="/crops" action="flow.addToGarden"
          payload={(fields) => ({ cropSheetId: sheetId, gardenId: Number(fields.get('gardenId')),
            initialQuantity: Number(fields.get('quantity')), transplantDate: today() })}
          onSaved={(crop) => saved({ crop }, 'flow.gardenAdded')}>
          <QuantityField label="flow.plantQuantity" />
          <GardenField gardens={gardens} />
        </CultivationForm> : <p>{t('flow.gardenRequired')}</p>}
      </details>
    </div>

    {gardens.length === 0 && <details className="flow-card flow-create-garden">
      <summary>{t('actions.createGarden')}</summary>
      <GardenCreationForm {...requestProps} onSaved={(garden) => saved({ garden }, 'flow.gardenCreated')} />
    </details>}

    <div className="flow-inventory">
      <section aria-labelledby="sheet-seed-stock">
        <h3 className="flow-lots-heading" id="sheet-seed-stock">{t('seeds.heading')}</h3>
        {seeds.length ? <ul className="flow-lots">
          {seeds.map((seed) => <li key={seed.id} className="flow-card">
            <QuantityEditor {...requestProps} path={`/seeds/${seed.id}`}
              quantity={seed.quantity} quantityLabel="seeds.quantity"
              onChanged={(updated) => onChanged({ seeds: [updated] })} />
            {seed.notes && <p className="flow-lot-title">{seed.notes}</p>}
          </li>)}
        </ul> : <p className="flow-empty">{t('seeds.empty')}</p>}
      </section>

      <section aria-labelledby="sheet-seedling-stock">
        <h3 className="flow-lots-heading" id="sheet-seedling-stock">{t('flow.lots')}</h3>
        {lots.length ? <ul className="flow-lots">
          {lots.map((lot) => <li key={lot.id} id={`plantel-${lot.id}`} className="flow-card" tabIndex={-1}>
            <QuantityEditor {...requestProps} path={`/seedlings/${lot.id}`}
              quantity={lot.quantity} quantityLabel="seedbed.seedlingCount"
              onChanged={(seedling) => onChanged({ seedling })} />
            <div className="flow-lot-title">
              <LotDate date={lot.sowingDate} />
              {lot.notes && <span>{lot.notes}</span>}
            </div>
            {lot.quantity > 0 && (gardens.length ? <details className="flow-transplant">
              <summary>{t('flow.transplant')}</summary>
              <CultivationForm {...requestProps} path={`/seedlings/${lot.id}/transplant`}
                action="flow.transplant" conflict="flow.lotChanged"
                payload={(fields) => ({ quantity: Number(fields.get('quantity')), gardenId: Number(fields.get('gardenId')) })}
                onSaved={(result) => saved(result, 'flow.transplanted')}>
                <QuantityField label="flow.plantQuantity" max={lot.quantity} />
                <GardenField gardens={gardens} />
              </CultivationForm>
            </details> : <p>{t('flow.gardenRequired')}</p>)}
          </li>)}
        </ul> : <p className="flow-empty">{t('flow.noSeedlingRecords')}</p>}
      </section>
    </div>

    <h3 className="flow-lots-heading">{t('flow.gardenPlantings')}</h3>
    {crops.length ? <ul className="flow-lots">
      {crops.map((crop) => {
        const date = crop.transplantDate && dateFormat.format(new Date(crop.transplantDate))
        return <li key={crop.id} className="flow-card">
          <div className="flow-lot-title">
            <strong>{crop.gardenName}</strong>
          </div>
          <QuantityEditor {...requestProps} path={`/crops/${crop.id}`}
            quantity={crop.currentQuantity ?? crop.initialQuantity} quantityLabel="garden.plants"
            onChanged={(updated) => onChanged({ crop: updated })} />
          <div className="flow-lot-title">
            {date && <time dateTime={crop.transplantDate}>{date}</time>}
            {crop.notes && <span>{crop.notes}</span>}
          </div>
        </li>
      })}
    </ul> : <p className="flow-empty">{t('flow.noGardenPlantings')}</p>}
  </section>
}
