import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api.js'
import Dashboard from './Dashboard.jsx'
import SeedBankPage from './SeedBankPage.jsx'
import CropSheetPage from './CropSheetPage.jsx'
import CultivationOverview from './CultivationOverview.jsx'

const emptyInventory = { status: 'loading', seeds: [], sheets: [], gardens: [], crops: [], seedlings: [] }

function upsert(items, item) {
  return items.some(({ id }) => id === item.id) ? items.map((current) => current.id === item.id ? item : current) : [...items, item]
}

export default function SignedInContent({ token, page, sheetId, onSignOut }) {
  const [inventory, setInventory] = useState(emptyInventory)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const options = { token, signal: controller.signal }
    Promise.all([apiRequest('/seeds', options), apiRequest('/crop-sheets', options),
      apiRequest('/gardens', options), apiRequest('/crops', options), apiRequest('/seedlings', options)])
      .then(([seeds, sheets, gardens, crops, seedlings]) => {
        if (!controller.signal.aborted) setInventory({ status: 'ready', seeds, sheets, gardens, crops, seedlings })
      })
      .catch((failure) => {
        if (controller.signal.aborted) return
        if (failure.status === 401) onSignOut(true, token)
        else setInventory({ ...emptyInventory, status: 'error' })
      })
    return () => controller.abort()
  }, [attempt, onSignOut, token])

  function retry() {
    setInventory(emptyInventory)
    setAttempt((count) => count + 1)
  }

  function updateCultivation({ seeds = [], seedling, crop, garden, cropSheet }) {
    setInventory((current) => ({
      ...current,
      seeds: seeds.reduce(upsert, current.seeds),
      seedlings: seedling ? upsert(current.seedlings, seedling) : current.seedlings,
      crops: crop ? upsert(current.crops, crop) : current.crops,
      gardens: garden ? upsert(current.gardens, garden) : current.gardens,
      sheets: cropSheet ? upsert(current.sheets, cropSheet) : current.sheets,
    }))
  }

  const sheetById = new Map(inventory.sheets.map((sheet) => [sheet.id, sheet]))
  const stockBySheet = new Map()
  for (const seed of inventory.seeds) {
    const sheet = sheetById.get(seed.cropSheetId)
    const stock = stockBySheet.get(seed.cropSheetId) ?? { quantity: 0, notes: [] }
    stockBySheet.set(seed.cropSheetId, {
      id: seed.cropSheetId,
      cropSheetId: seed.cropSheetId,
      name: sheet?.name ?? seed.cropSheetName,
      variety: sheet?.variety,
      catalogIconId: sheet?.catalogIconId,
      quantity: stock.quantity + seed.quantity,
      notes: seed.notes ? [...stock.notes, seed.notes] : stock.notes,
    })
  }
  const seeds = [...stockBySheet.values()].map((stock) => ({ ...stock, notes: stock.notes.join('\n') }))
  const gardens = inventory.gardens.map((garden) => {
    const bySheet = new Map()
    for (const crop of inventory.crops) {
      if (crop.gardenId !== garden.id) continue
      const sheet = sheetById.get(crop.cropSheetId)
      const previous = bySheet.get(crop.cropSheetId)
      bySheet.set(crop.cropSheetId, {
        id: crop.cropSheetId, cropSheetId: crop.cropSheetId,
        name: sheet?.name ?? crop.cropSheetName,
        catalogIconId: sheet?.catalogIconId,
        quantity: (previous?.quantity ?? 0) + (crop.currentQuantity ?? crop.initialQuantity),
      })
    }
    return { ...garden, crops: [...bySheet.values()] }
  })
  const lots = inventory.seedlings.map((seedling) => {
    const sheet = sheetById.get(seedling.cropSheetId)
    return {
      ...seedling,
      name: sheet?.name ?? seedling.cropSheetName,
      catalogIconId: sheet?.catalogIconId,
      quantity: seedling.remainingQuantity ?? (seedling.sownQuantity - (seedling.transplantedQuantity ?? 0)),
    }
  })
  const viewInventory = { status: inventory.status, seeds, gardens, lots: lots.filter((lot) => lot.quantity > 0) }

  if (sheetId) {
    const id = Number(sheetId)
    const belongsToSheet = (record) => record.cropSheetId === id
    return <CropSheetPage key={sheetId} sheet={sheetById.get(id)} status={inventory.status}
      token={token} onSignOut={onSignOut} onRetry={retry}
      stock={stockBySheet.get(id)?.quantity ?? 0} seeds={inventory.seeds.filter(belongsToSheet)}
      lots={lots.filter(belongsToSheet)} crops={inventory.crops.filter(belongsToSheet)}
      gardens={inventory.gardens} onCultivationChange={updateCultivation}
      onSaved={(sheet) => setInventory((current) => ({ ...current, sheets: upsert(current.sheets, sheet) }))} />
  }

  if (page === 'bank') return <SeedBankPage inventory={viewInventory} onRetry={retry} token={token} onSignOut={onSignOut}
    onStockSaved={({ seed, cropSheet }) => updateCultivation({ seeds: [seed], cropSheet })} />

  if (page === 'seedbed' || page === 'gardens') return <CultivationOverview key={page} page={page}
    inventory={viewInventory} onRetry={retry} token={token} onSignOut={onSignOut} onChanged={updateCultivation} />

  return <Dashboard inventory={viewInventory} onRetry={retry} token={token} onSignOut={onSignOut} />
}
