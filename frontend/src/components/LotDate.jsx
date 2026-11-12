import { useTranslation } from 'react-i18next'

export default function LotDate({ date }) {
  const { t, i18n } = useTranslation()
  if (!date) return <span>{t('flow.undatedLot')}</span>
  const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeZone: 'UTC' })
  return <time dateTime={date}>{t('flow.sownOn', { date: formatter.format(new Date(date)) })}</time>
}
