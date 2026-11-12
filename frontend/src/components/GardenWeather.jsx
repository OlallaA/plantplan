import { useTranslation } from 'react-i18next'
import { weatherCondition } from '../lib/weather.js'

export default function GardenWeather({ gardenId, weather, todayOnly }) {
  const { t, i18n } = useTranslation()
  const { hasCoordinates, status, forecast, retry } = weather
  const headingId = `garden-weather-${gardenId}`

  const formatDay = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
  const formatNumber = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 })
  const measurement = (value, unit) => Number.isFinite(value)
    ? t(`weather.units.${unit}`, { value: formatNumber.format(value) })
    : '—'
  const condition = (code) => t(`weather.conditions.${weatherCondition(code)}`)
  const { current, daily } = forecast ?? {}
  const today = daily?.[0]
  const metrics = todayOnly && today ? [
    ['todayHigh', today.temperatureMaxC, 'temperature'],
    ['todayLow', today.temperatureMinC, 'temperature'],
    ['rainChance', today.precipitationProbabilityMaxPercent, 'percent'],
  ] : [
    ['humidity', current?.relativeHumidityPercent, 'percent'],
    ['precipitation', current?.precipitationMm, 'rain'],
    ['wind', current?.windSpeedKmh, 'wind'],
  ]

  return <section className={`garden-weather${todayOnly ? ' garden-weather-today' : ''}`} aria-labelledby={headingId}>
    <div className="garden-weather-heading">
      <h4 id={headingId}>{t(todayOnly ? 'weather.today' : 'weather.heading')}</h4>
      {forecast && <a href="https://open-meteo.com/">{t('weather.source')}</a>}
    </div>
    {!hasCoordinates ? <p>{t('weather.noCoordinates')}</p>
      : status === 'loading' ? <p role="status">{t('weather.loading')}</p>
      : status === 'error' ? <div className="garden-weather-error">
        <p role="status">{t('weather.loadError')}</p>
        <button type="button" className="bank-button" onClick={retry}>{t('actions.retry')}</button>
      </div> : <>
        <div className="garden-weather-current">
          <div className="garden-weather-now">
            <strong>{measurement(current.temperatureC, 'temperature')}</strong>
            <span>{t(current.daylight === false ? 'weather.night' : 'weather.now')} · {condition(current.weatherCode)}</span>
          </div>
          <dl className="garden-weather-metrics">
            {metrics.map(([label, value, unit]) => <div key={label}>
              <dt>{t(`weather.${label}`)}</dt>
              <dd>{measurement(value, unit)}</dd>
            </div>)}
          </dl>
        </div>
        {status === 'stale' && <p className="garden-weather-stale" role="status">{t('weather.stale')}</p>}
        {!todayOnly && daily.length > 0 && <>
          <h5 className="garden-weather-forecast-title">{t('weather.forecast')}</h5>
          <ul className="garden-weather-days">
            {daily.map((day) => <li key={day.date}>
              <time dateTime={day.date}>{formatDay.format(new Date(`${day.date}T00:00:00Z`))}</time>
              <span>{condition(day.weatherCode)}</span>
              <strong>{t('weather.dailyTemperatures', {
                max: measurement(day.temperatureMaxC, 'temperature'),
                min: measurement(day.temperatureMinC, 'temperature'),
              })}</strong>
              <span>{t('weather.dailyRain', {
                chance: measurement(day.precipitationProbabilityMaxPercent, 'percent'),
                amount: measurement(day.precipitationSumMm, 'rain'),
              })}</span>
            </li>)}
          </ul>
        </>}
      </>}
  </section>
}
