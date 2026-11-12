import { useTranslation } from 'react-i18next'
import PlantIllustration from './PlantIllustration.jsx'
import AppLink, { cropSheetPath, seedBankHref } from './AppLink.jsx'
import { limits } from '../lib/presentation.js'

export default function SeedBankCard({ seeds, status = 'example', onRetry }) {
  const { t } = useTranslation()
  const visible = seeds.slice(0, limits.seeds)
  const example = status === 'example'
  return <section className="cultivation-card seed-bank" aria-labelledby="seed-bank-heading">
    <div className="card-heading"><h2 id="seed-bank-heading">{t('seeds.heading')}</h2>
      {(example || status === 'ready') && <span className="count-badge">{t(example ? 'seeds.varieties' : 'seeds.records', { count: seeds.length })}</span>}
    </div>
    {visible.length ? <div className="wood-cabinet">
      {[visible.slice(0, 3), visible.slice(3, 6)].filter((row) => row.length).map((row, index) => <ul key={index} className="seed-shelf">
        {row.map((seed) => <li key={seed.id}><SeedPacket seed={seed} example={example} /></li>)}
      </ul>)}
    </div> : <SeedInventoryMessage status={status} onRetry={onRetry} />}
    <div className="bank-note">
      {seeds.length > limits.seeds && <span>{t(example ? 'seeds.more' : 'seeds.moreRecords', { count: seeds.length - limits.seeds })}</span>}
      {example && <span>{t('seeds.example')}</span>}
    </div>
    <div className="card-actions">
      <AppLink className="bank-button" href={seedBankHref}>{t('actions.seedBank')}</AppLink>
      <AppLink className="bank-button bank-button-primary" href={`${seedBankHref}#engadir-sementes`}>{t('actions.addSeeds')}</AppLink>
    </div>
  </section>
}

export function SeedInventoryMessage({ status, onRetry }) {
  const { t } = useTranslation()
  if (status === 'loading') return <p className="empty-state" role="status">{t('seeds.loading')}</p>
  if (status === 'error') return <div className="empty-state">
    <p role="alert">{t('seeds.loadError')}</p>
    <button type="button" className="bank-button" onClick={onRetry}>{t('actions.retry')}</button>
  </div>
  return <p className="empty-state">{t('seeds.empty')}</p>
}

export function SeedPacket({ seed, example = false }) {
  const { t } = useTranslation()
  const Packet = example ? 'button' : AppLink
  const attributes = example ? {
    type: 'button', 'aria-disabled': true,
    'aria-label': t('seeds.packetLabel', { name: seed.name, variety: seed.variety, count: seed.quantity }),
  } : { href: `${cropSheetPath}${seed.cropSheetId}` }
  return <Packet {...attributes} className={`seed-packet packet-${seed.catalogIconId ?? seed.species ?? 'generic'}${example ? '' : ' crop-sheet-link'}`}>
    <span className="packet-top" aria-hidden="true">{t('seeds.packetBrand')}</span>
    <span className="packet-art"><PlantIllustration catalogIconId={seed.catalogIconId} species={seed.species ?? 'generic'} /></span>
    <strong>{seed.name}</strong><span className="packet-variety">{seed.variety}</span>
    <span className="packet-quantity">{t('seeds.quantity', { count: seed.quantity })}</span>
  </Packet>
}
