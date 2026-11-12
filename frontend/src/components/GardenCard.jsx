import { useTranslation } from 'react-i18next'
import PlantIllustration, { SproutMark } from './PlantIllustration.jsx'
import AppLink, { cropSheetPath, gardenEntryId, gardensHref } from './AppLink.jsx'
import { gardenPlantGroups, limits, totalPlants } from '../lib/presentation.js'
import useGardenWeather from '../lib/useGardenWeather.js'
import { gardenWeatherEffect } from '../lib/weather.js'
import GardenWeather from './GardenWeather.jsx'
import GardenWeatherEffect from './GardenWeatherEffect.jsx'

export default function GardenCard({ gardens, status = 'ready', onRetry, full = false, token, onSignOut }) {
  const { t } = useTranslation()
  const visibleGardens = full ? gardens : gardens.slice(0, limits.gardens)
  const isMultiple = gardens.length > 1
  const Heading = full ? 'h1' : 'h2'
  return <section className={`cultivation-card garden-card${full ? ' full-garden-card' : ''}`} aria-labelledby="garden-heading">
    <div className="card-heading"><Heading id="garden-heading">{t(full ? 'garden.overview' : 'garden.heading')}</Heading>
      {status === 'ready' && <span className="count-badge">{t('garden.count', { count: gardens.length })}</span>}
    </div>
    {status === 'loading' ? <p className="empty-state" role="status">{t('garden.loading')}</p>
      : status === 'error' ? <div className="empty-state"><p role="alert">{t('garden.loadError')}</p>
        <button type="button" className="bank-button" onClick={onRetry}>{t('actions.retry')}</button></div>
        : gardens.length === 0 ? <div className="garden-empty"><SproutMark /><p>{t('garden.empty')}</p></div>
          : <div className={`garden-plots ${isMultiple && !full ? 'multiple-plots' : ''}`}>
            {visibleGardens.map((garden) => <GardenPlot key={`${garden.id}:${garden.latitude},${garden.longitude}`}
              garden={garden} token={token} onSignOut={onSignOut} full={full} />)}
          </div>}
    {!full && <div className="garden-footer">
      {gardens.length > visibleGardens.length && <p>{t('garden.more', { count: gardens.length - visibleGardens.length })}</p>}
      <AppLink className="bank-button" href={gardensHref}>{t(isMultiple ? 'actions.gardens' : 'actions.garden')}</AppLink>
      <AppLink className="bank-button bank-button-primary" href={`${gardensHref}#${gardenEntryId}`}>{t('actions.addPlant')}</AppLink>
    </div>}
  </section>
}

function GardenPlot({ garden, token, onSignOut, full }) {
  const { t } = useTranslation()
  const weather = useGardenWeather(garden, token, onSignOut)
  const effect = gardenWeatherEffect(weather.forecast?.current)
  const night = weather.forecast?.current?.daylight === false
  const groups = gardenPlantGroups(garden.crops)
  const additional = groups.reduce((sum, group) => sum + group.additional, 0)
  return <section className={`garden-plot${effect ? ` garden-plot-${effect}` : ''}${night && effect !== 'night' ? ' garden-plot-night' : ''}`}
    aria-labelledby={`garden-${garden.id}`}>
    {effect && <GardenWeatherEffect key={effect} effect={effect} />}
    <div className="plot-title"><div><h3 id={`garden-${garden.id}`}>{garden.name}</h3><p>{garden.location}</p></div><span>{t('garden.plants', { count: totalPlants(garden.crops) })}</span></div>
    {token && <GardenWeather gardenId={garden.id} weather={weather} todayOnly={!full} />}
    {groups.length === 0 ? <p className="empty-state">{t('garden.noCrops')}</p> : <>
      <div className="crop-beds">{groups.map((group) => {
        const href = group.cropSheetId && `${cropSheetPath}${group.cropSheetId}`
        const Card = href ? AppLink : 'div'
        return <Card className={href ? 'crop-bed crop-sheet-link' : 'crop-bed'} key={group.id} href={href}>
          {group.visible > 0 && <div className="soil-row" aria-hidden="true">
            {Array.from({ length: group.visible }, (_, index) => <PlantIllustration key={index}
              catalogIconId={group.catalogIconId} species={group.species} />)}
          </div>}
          <p><strong>{t('garden.cropQuantity', { count: group.quantity, name: group.name })}</strong>{group.additional > 0 &&
            <span>{t('common.undrawn', { count: group.additional })}</span>}</p>
        </Card>
      })}</div>
      {additional > 0 && <p className="additional-plants">{t('garden.additional', { count: additional })}</p>}
    </>}
  </section>
}
