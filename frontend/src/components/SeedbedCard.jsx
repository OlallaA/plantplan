import { useTranslation } from 'react-i18next'
import { SproutMark } from './PlantIllustration.jsx'
import AppLink, { cropSheetPath, seedbedEntryId, seedbedHref } from './AppLink.jsx'
import LotDate from './LotDate.jsx'
import { allocatePlants, limits, seedbedStage, totalPlants } from '../lib/presentation.js'

export default function SeedbedCard({ seedbed, lots, status, onRetry, full = false }) {
  const { t } = useTranslation()
  const live = lots !== undefined
  const germinating = live ? 0 : totalPlants(seedbed.germinating)
  const seedlings = live ? 0 : totalPlants(seedbed.seedlings)
  const Heading = full ? 'h1' : 'h2'
  const visible = live ? (full ? lots : lots.slice(0, limits.seedbedLots)) : []
  return <section className={`cultivation-card seedbed-card${live ? ' live-seedbed' : ''}`} aria-labelledby="seedbed-heading">
    <div className="card-heading">
      <Heading id="seedbed-heading">{t('seedbed.heading')}</Heading>
      {(!live || status === 'ready') && <span className="count-badge">{live
        ? t('flow.pending', { count: totalPlants(lots) }) : t('seedbed.growing', { count: germinating + seedlings })}</span>}
    </div>
    {live ? <LiveSeedbed lots={visible} status={status} onRetry={onRetry} /> : <>
    <div className="seedbed-stage">
      <h3><span className="stage-dot" aria-hidden="true" />{t('seedbed.germinating')} <span>{t('seedbed.sown', { count: germinating })}</span></h3>
      <div className="seedbed-groups">{allocatePlants(seedbed.germinating, limits.seedbedPlants).map((group) => <SeedlingGroup key={group.id} group={group} stage="germinating" />)}</div>
    </div>
    <div className="seedbed-stage young-stage">
      <h3><span className="stage-dot" aria-hidden="true" />{t('seedbed.seedlings')} <span>{t('seedbed.young', { count: seedlings })}</span></h3>
      <div className="seedbed-groups">{allocatePlants(seedbed.seedlings, limits.seedbedPlants).map((group) => <SeedlingGroup key={group.id} group={group} />)}</div>
    </div>
    </>}
    {!full && <div className="card-actions seedbed-actions">
      {live && lots.length > visible.length && <p className="seedbed-more">{t('seedbed.more', { count: lots.length - visible.length })}</p>}
      <AppLink className="bank-button" href={seedbedHref}>{t('actions.seedbed')}</AppLink>
      <AppLink className="bank-button bank-button-primary" href={`${seedbedHref}#${seedbedEntryId}`}>{t('flow.addSeedlings')}</AppLink>
    </div>}
  </section>
}

function LiveSeedbed({ lots, status, onRetry }) {
  const { t } = useTranslation()
  if (status === 'loading') return <p className="empty-state" role="status">{t('flow.loadingLots')}</p>
  if (status === 'error') return <div className="empty-state">
    <p role="alert">{t('flow.loadLotsError')}</p>
    <button type="button" className="bank-button" onClick={onRetry}>{t('actions.retry')}</button>
  </div>
  if (!lots.length) return <p className="empty-state">{t('flow.emptyLots')}</p>
  return <ul className="seedbed-groups live-seedbed-groups">
    {allocatePlants(lots, limits.seedbedPlants).map((lot) => <li className="seedbed-lot" key={lot.id}>
      <SeedlingGroup group={lot} stage={seedbedStage(lot.sowingDate)} countKey="flow.pending" />
      <p className="lot-date"><LotDate date={lot.sowingDate} /></p>
      <AppLink className="bank-button" href={`${cropSheetPath}${lot.cropSheetId}#plantel-${lot.id}`}>{t('flow.transplant')}</AppLink>
    </li>)}
  </ul>
}

function SeedlingGroup({ group, stage = 'grown', countKey = stage === 'germinating' ? 'seedbed.sown' : 'seedbed.seedlingCount' }) {
  const { t } = useTranslation()
  const isGerminating = stage === 'germinating'
  return <div className={`seedling-group${isGerminating ? ' germinating-group' : ''}`}>
    {group.visible > 0 && <div className="seedling-drawings" aria-hidden="true">
      <div className="seedling-tray">
        {Array.from({ length: group.visible }, (_, index) => <span className="seedling-cell" key={index}>
          {isGerminating ? <span className="seedling-seed" /> : <SproutMark />}
        </span>)}
      </div>
    </div>}
    {countKey === 'flow.pending' && <span className="sr-only">{t(isGerminating ? 'seedbed.germinating' : 'seedbed.sprouts')}</span>}
    <p><strong>{group.name}</strong><span>{t(countKey, { count: group.quantity })}{group.additional > 0 && ` · ${t('common.undrawn', { count: group.additional })}`}</span></p>
  </div>
}
