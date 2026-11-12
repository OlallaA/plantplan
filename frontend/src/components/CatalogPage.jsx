import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '../lib/api.js'
import AppLink, { catalogHref, cropSheetPath, homeHref } from './AppLink.jsx'
import CultivationForm, { GardenCreationForm, GardenField, QuantityField } from './CultivationForm.jsx'
import LoginForm from './LoginForm.jsx'
import CatalogIcon from './CatalogIcon.jsx'

const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
const stages = ['sowing', 'transplant', 'harvest']
const destinations = {
  bank: { path: '/seeds/stock', action: 'catalog.addToBank' },
  seedbed: { path: '/seedlings/entry', action: 'catalog.addToSeedbed' },
  garden: { path: '/crops/entry', action: 'catalog.addToGarden' },
}

function useCatalogRequest(path, token, onSignOut) {
  const [request, setRequest] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    apiRequest(path, { token, signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted) setRequest({ status: 'ready', items })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        if (token && error.status === 401) onSignOut(true, token)
        else setRequest({ status: 'error' })
      })
    return () => controller.abort()
  }, [attempt, onSignOut, path, token])

  function retry() {
    setRequest({ status: 'loading' })
    setAttempt((count) => count + 1)
  }

  return { ...request, retry }
}

function RequestStatus({ request, errorText = 'catalog.loadError' }) {
  const { t } = useTranslation()
  if (request.status === 'loading') return <p role="status">{t('catalog.loading')}</p>
  return <div className="empty-state">
    <p role="alert">{t(errorText)}</p>
    <button className="bank-button" type="button" onClick={request.retry}>{t('actions.retry')}</button>
  </div>
}

export default function CatalogPage({ catalogId, session, onLogin, expired, onSignOut }) {
  const { t } = useTranslation()
  const catalog = useCatalogRequest('/catalog')
  const crop = catalog.items?.find(({ id }) => id === catalogId)

  return <div className="bank-page">
    <AppLink className="bank-button" href={catalogId ? catalogHref : homeHref}>
      ← {t(catalogId ? 'catalog.back' : 'actions.backToDashboard')}
    </AppLink>
    {catalog.status !== 'ready' ? <section className="cultivation-card bank-panel catalog-panel">
      <h1>{t('catalog.heading')}</h1>
      <RequestStatus request={catalog} />
    </section> : crop ? <CatalogDetail key={crop.id} crop={crop} session={session}
      onLogin={onLogin} expired={expired} onSignOut={onSignOut} />
      : catalogId ? <section className="cultivation-card bank-panel catalog-panel">
        <h1>{t('catalog.notFound')}</h1>
      </section> : <CatalogList crops={catalog.items} />}
  </div>
}

function localName(crop, language) {
  return language === 'es' ? crop.nameEs : crop.nameGl
}

function monthIndex(value) {
  return typeof value === 'number' ? value - 1 : months.indexOf(value)
}

function containsMonth(crop, stage, month) {
  const start = monthIndex(crop[`${stage}Start`])
  const end = monthIndex(crop[`${stage}End`])
  if (start < 0 || end < 0) return false
  return start <= end ? month >= start && month <= end : month >= start || month <= end
}

function formatMonth(formatter, month) {
  return formatter.format(new Date(Date.UTC(2026, month, 1)))
}

function CatalogList({ crops }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const [calendar, setCalendar] = useState(false)
  const [month, setMonth] = useState(() => new Date().getMonth())
  const formatter = new Intl.DateTimeFormat(language, { month: 'long', timeZone: 'UTC' })
  const sorted = crops.toSorted((left, right) => localName(left, language).localeCompare(localName(right, language), language))

  return <section className="cultivation-card bank-panel catalog-panel" aria-labelledby="catalog-heading">
    <h1 id="catalog-heading">{t('catalog.heading')}</h1>
    <div className="catalog-controls">
      <div className="catalog-actions" role="group" aria-label={t('catalog.view')}>
        <button className="bank-button" type="button" aria-pressed={!calendar}
          onClick={() => setCalendar(false)}>{t('catalog.all')}</button>
        <button className="bank-button" type="button" aria-pressed={calendar}
          onClick={() => setCalendar(true)}>{t('catalog.calendar')}</button>
      </div>
      {calendar && <label className="catalog-month">
        {t('catalog.month')}
        <select className="bank-button" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
          {months.map((name, index) => <option key={name} value={index}>{formatMonth(formatter, index)}</option>)}
        </select>
      </label>}
    </div>
    {calendar ? stages.map((stage) => {
      const matches = sorted.filter((crop) => containsMonth(crop, stage, month))
      return <section className="catalog-season" key={stage}>
        <h2>{t(`sheet.${stage}`)}</h2>
        {matches.length > 0 ? <CatalogCards crops={matches} language={language} />
          : <p>{t('catalog.noCrops')}</p>}
      </section>
    }) : <CatalogCards crops={sorted} language={language} />}
  </section>
}

function CatalogCards({ crops, language }) {
  return <ul className="catalog-grid">
    {crops.map((crop) => <li key={crop.id}>
      <AppLink className="catalog-card crop-sheet-link" href={`${catalogHref}/${crop.id}`}>
        <CatalogIcon crop={crop.id} />
        <strong>{localName(crop, language)}</strong>
      </AppLink>
    </li>)}
  </ul>
}

function CatalogDetail({ crop, session, onLogin, expired, onSignOut }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const name = localName(crop, language)
  const [destination, setDestination] = useState(null)
  const formatter = new Intl.DateTimeFormat(language, { month: 'long', timeZone: 'UTC' })

  function period(stage) {
    const start = monthIndex(crop[`${stage}Start`])
    const end = monthIndex(crop[`${stage}End`])
    if (start < 0) return t('catalog.noTransplant')
    const first = formatMonth(formatter, start)
    return start === end ? first : `${first} – ${formatMonth(formatter, end)}`
  }

  return <div className="bank-grid">
    <section className="cultivation-card bank-panel" aria-labelledby="catalog-crop-heading">
      <div className="catalog-crop-title">
        <CatalogIcon crop={crop.id} />
        <h1 id="catalog-crop-heading">{name}</h1>
      </div>
      <dl className="catalog-facts">
        {stages.map((stage) => <div key={stage}>
          <dt>{t(stage === 'sowing' ? 'catalog.planting' : `sheet.${stage}`)}</dt>
          <dd>{period(stage)}{stage === 'sowing' && ` · ${t(`catalog.methods.${crop.plantingMethod}`)}`}</dd>
        </div>)}
        <div>
          <dt>{t('sheet.sunExposure')}</dt>
          <dd>{t(crop.sunExposure === 'PARTIAL_SHADE' ? 'catalog.sunOrShade' : `sheet.exposures.${crop.sunExposure}`)}</dd>
        </div>
        <div>
          <dt>{t('catalog.water')}</dt>
          <dd>{t('catalog.amount', { min: crop.waterMin, max: crop.waterMax,
            context: crop.waterMin === crop.waterMax ? 'single' : undefined })}
            {crop.wateringGeneral && ` · ${t('catalog.generalEstimate')}`}
            <small>{t('catalog.waterContext')}</small>
          </dd>
        </div>
      </dl>
      <p className="catalog-note">{language === 'es' ? crop.notesEs : crop.notesGl}</p>
      <p className="catalog-note">{t('catalog.calendarContext')}</p>
      <div className="catalog-sources">
        <a href={crop.growingSource}>{t('catalog.growingSource')}</a>
        <a href={crop.wateringSource}>{t('catalog.wateringSource')}</a>
        {crop.wateringGeneral && <a href="https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/watering-the-vegetable-garden">
          {t('catalog.generalWaterSource')}
        </a>}
      </div>
    </section>
    <section className="cultivation-card bank-panel" aria-labelledby="catalog-add-heading">
      <h2 id="catalog-add-heading">{t('catalog.add')}</h2>
      <div className="catalog-actions" role="group" aria-labelledby="catalog-add-heading">
        {Object.entries(destinations).map(([id, { action }]) => <button key={id}
          className="bank-button" type="button" aria-pressed={destination === id}
          onClick={() => setDestination(id)}>{t(action)}</button>)}
      </div>
      {destination && (session ? destination === 'garden'
        ? <CatalogGardenEntry key={session.token} crop={crop} name={name} token={session.token} onSignOut={onSignOut} />
        : <CatalogEntry key={destination} destination={destination} crop={crop} name={name}
          token={session.token} onSignOut={onSignOut} />
        : <LoginForm embedded onLogin={onLogin} expired={expired} prompt="catalog.signIn" />)}
    </section>
  </div>
}

function CatalogGardenEntry({ crop, name, token, onSignOut }) {
  const { t } = useTranslation()
  const request = useCatalogRequest('/gardens', token, onSignOut)
  const [createdGarden, setCreatedGarden] = useState(null)

  if (request.status !== 'ready') return <RequestStatus request={request} errorText="garden.loadError" />

  const gardens = createdGarden ? [...request.items, createdGarden] : request.items
  return gardens.length ? <CatalogEntry destination="garden" crop={crop} name={name}
    token={token} onSignOut={onSignOut} gardens={gardens} />
    : <>
      <p className="flow-empty">{t('flow.gardenRequired')}</p>
      <GardenCreationForm token={token} onSignOut={onSignOut} onSaved={setCreatedGarden} />
    </>
}

function CatalogEntry({ destination, crop, name, token, onSignOut, gardens }) {
  const { t, i18n } = useTranslation()
  const [sheetId, setSheetId] = useState(null)
  const { path, action } = destinations[destination]

  return <>
    <CultivationForm path={path} action={action} token={token} onSignOut={onSignOut}
      payload={(fields) => ({
        name,
        catalogId: crop.id,
        catalogLanguage: i18n.resolvedLanguage,
        variety: fields.get('variety').trim() || null,
        quantity: Number(fields.get('quantity')),
        ...(gardens ? { gardenId: Number(fields.get('gardenId')) } : {}),
      })}
      onSaved={({ cropSheet }) => setSheetId(cropSheet.id)}>
      <label>{t('seeds.varietyOptional')}<input name="variety" maxLength={100} /></label>
      <QuantityField label={destination === 'bank' ? 'seeds.quantityLabel' : 'flow.plantQuantity'} />
      {gardens && <GardenField gardens={gardens} />}
    </CultivationForm>
    {sheetId && <div className="catalog-result">
      <p role="status">{t('catalog.saved')}</p>
      <AppLink className="bank-button" href={`${cropSheetPath}${sheetId}`}>{t('catalog.openSheet')}</AppLink>
    </div>}
  </>
}
