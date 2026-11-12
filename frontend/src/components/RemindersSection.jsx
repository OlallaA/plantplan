import { useTranslation } from 'react-i18next'
import { limits } from '../lib/presentation.js'
import { TaskIcon } from './PlantIllustration.jsx'
import PendingAction from './PendingAction.jsx'

const taskIcons = {
  WATERING: 'watering',
  SOWING_START: 'sowing',
  SOWING_END_WARNING: 'sowing',
  TRANSPLANT_START: 'transplant',
  TRANSPLANT_END_WARNING: 'transplant',
}

export default function RemindersSection({ reminders }) {
  const { t, i18n } = useTranslation()
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return <section aria-labelledby="reminders-heading" className="reminders-section">
    <div className="section-line">
      <h2 id="reminders-heading">{t('reminders.heading')}</h2>
      <PendingAction screen="reminders" />
    </div>
    {reminders.length === 0 ? <p className="empty-reminders">{t('reminders.empty')}</p> :
      <ul className="reminder-list">
        {reminders.slice(0, limits.reminders).map(({ id, tipo, scheduledDate, cropSheetName }) => {
          const task = t(`reminders.types.${tipo}`)
          const icon = taskIcons[tipo]
          return <li key={id} className="reminder">
            <span className={`task-icon task-${icon}`}><TaskIcon type={icon} /></span>
            <div className="reminder-description">
              <span className="reminder-task">{task} <time dateTime={scheduledDate}>{dates.format(new Date(scheduledDate))}</time></span>
              <strong>{cropSheetName}</strong>
            </div>
            <button className="complete-reminder" type="button" disabled aria-label={t('reminders.completeLabel', { task, crop: cropSheetName })}>
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 10 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </li>
        })}
      </ul>}
    <p className="reminders-note">{t('reminders.demoNote')}</p>
  </section>
}
