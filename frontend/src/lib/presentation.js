export const limits = Object.freeze({ seeds: 6, reminders: 3, gardenPlantsPerCrop: 12, seedbedPlants: 12, seedbedLots: 4, gardens: 2 })

// Always keep the total in text, even when the illustration budget is exhausted.
export function allocatePlants(groups, limit) {
  let remaining = Math.max(0, limit)
  return groups.map((group) => {
    const visible = Math.min(Math.max(0, group.quantity), remaining)
    remaining -= visible
    return { ...group, visible, additional: Math.max(0, group.quantity - visible) }
  })
}

export function gardenPlantGroups(crops) {
  return crops.map((crop) => {
    const visible = Math.min(crop.quantity, limits.gardenPlantsPerCrop)
    return { ...crop, visible, additional: crop.quantity - visible }
  })
}

export function seedbedStage(sowingDate, today = new Date()) {
  if (!sowingDate) return 'grown'
  const todayStart = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const sowingStart = Date.parse(`${sowingDate}T00:00:00Z`)
  return todayStart - sowingStart < 7 * 86400000 ? 'germinating' : 'grown'
}

export function totalPlants(groups) {
  return groups.reduce((total, group) => total + group.quantity, 0)
}
