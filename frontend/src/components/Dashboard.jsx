import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppLink, { catalogHref } from './AppLink.jsx'
import { getDemoData, scenarios } from '../data/demoData.js'
import RemindersSection from './RemindersSection.jsx'
import SeedBankCard from './SeedBankCard.jsx'
import SeedbedCard from './SeedbedCard.jsx'
import GardenCard from './GardenCard.jsx'

export default function Dashboard({ inventory, onRetry, token, onSignOut }) {
  const { t } = useTranslation()
  const [scenario, setScenario] = useState('one')
  const { seeds, seedbed, gardens, reminders } = getDemoData(t)
  const displayedGardens = scenario === 'none' ? [] : scenario === 'many' ? gardens : gardens.slice(0, 1)

  return <>
    <h1 className="sr-only">PlantPlan</h1>
    <RemindersSection reminders={scenario === 'quiet' ? [] : reminders} />
    <GardenCard gardens={inventory?.gardens ?? displayedGardens} status={inventory?.status} onRetry={onRetry}
      token={token} onSignOut={onSignOut} />
    <div className="dashboard-catalog">
      <AppLink className="bank-button bank-button-primary dashboard-catalog-link" href={catalogHref}>
        {t('catalog.heading')} <span aria-hidden="true">→</span>
      </AppLink>
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SeedbedCard seedbed={seedbed} lots={inventory?.lots} status={inventory?.status} onRetry={onRetry} />
      <SeedBankCard seeds={inventory?.seeds ?? seeds} status={inventory?.status} onRetry={onRetry} />
    </div>
    <aside className="demo-controls" aria-labelledby="demo-controls-heading">
      <div><h2 id="demo-controls-heading">{t('demo.heading')}</h2><p>{t(inventory ? 'demo.remaining' : 'demo.noSave')}</p></div>
      {!inventory && <><div className="scenario-field">
        <label htmlFor="scenario">{t('demo.scenario')}</label>
        <select id="scenario" value={scenario} onChange={(event) => setScenario(event.target.value)}>
          {scenarios.map((item) => <option value={item} key={item}>{t(`demo.scenarios.${item}`)}</option>)}
        </select>
      </div>
      <p className="sr-only" role="status">{t('demo.scenarioStatus', {
        scenario: t(`demo.scenarios.${scenario}`),
        gardens: t('garden.count', { count: displayedGardens.length }),
      })}</p></>}
    </aside>
  </>
}
