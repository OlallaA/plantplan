// Presentation fixtures. Their labels are translated here so components can also accept real names as written.
export const scenarios = ['one', 'many', 'none', 'quiet']

export function getDemoData(t) {
  const seed = (id, species, quantity, nameKey = species) => ({
    id, species, quantity, name: t(`demo.species.${nameKey}`), variety: t(`demo.varieties.${nameKey}`),
  })
  const seedling = (id, species, quantity) => ({ id, species, quantity, name: t(`demo.species.${species}`) })
  const crop = (id, species, quantity) => ({ id, species, quantity, name: t(`demo.crops.${species}`, { count: quantity }) })
  const garden = (id, key, crops) => ({
    id, crops, name: t(`demo.gardens.${key}.name`), location: t(`demo.gardens.${key}.location`),
  })

  return {
    seeds: [
      seed(1, 'tomato', 36),
      seed(2, 'lettuce', 120),
      seed(3, 'carrot', 85),
      seed(4, 'basil', 42),
      seed(5, 'pepper', 28),
      seed(6, 'radish', 64),
      seed(7, 'lettuce', 50, 'spinach'),
      seed(8, 'basil', 30, 'parsley'),
    ],
    // The backend does not yet expose germination stages.
    seedbed: {
      germinating: [seedling('g1', 'tomato', 6), seedling('g2', 'basil', 4)],
      seedlings: [seedling('p1', 'lettuce', 4), seedling('p2', 'pepper', 3)],
    },
    gardens: [
      garden(1, 'home', [crop('c1', 'lettuce', 4), crop('c2', 'tomato', 3), crop('c3', 'pepper', 5)]),
      garden(2, 'school', [crop('c4', 'carrot', 8), crop('c5', 'lettuce', 4), crop('c6', 'radish', 6)]),
      garden(3, 'terrace', []),
    ],
    // Match the fields used from ReminderResponse, with fixed dates for the visual demo.
    reminders: [
      { id: 1, tipo: 'WATERING', cropSheetName: t('demo.species.tomato'), scheduledDate: '2026-11-02' },
      { id: 2, tipo: 'TRANSPLANT_START', cropSheetName: t('demo.species.lettuce'), scheduledDate: '2026-11-03' },
      { id: 3, tipo: 'SOWING_START', cropSheetName: t('demo.species.radish'), scheduledDate: '2026-11-05' },
      { id: 4, tipo: 'WATERING', cropSheetName: t('demo.species.pepper'), scheduledDate: '2026-11-06' },
    ],
  }
}
