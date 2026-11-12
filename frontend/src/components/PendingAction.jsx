import { useTranslation } from 'react-i18next'

export default function PendingAction({ screen, label, primary = false }) {
  const { t } = useTranslation()
  return <button type="button" disabled className={`pending-action ${primary ? 'pending-primary' : ''}`}>
    {primary && <span aria-hidden="true">＋</span>}
    {label ?? t(`actions.${screen}`)}
    <span className="pending-caption">{t('actions.pending')}</span>
  </button>
}
