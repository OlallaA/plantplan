import test from 'node:test'
import assert from 'node:assert/strict'
import { allocatePlants, gardenPlantGroups, seedbedStage, totalPlants } from '../src/lib/presentation.js'

test('small gardens retain one illustration per individual plant', () => {
  const groups = [{ quantity: 4 }, { quantity: 3 }, { quantity: 5 }]
  assert.deepEqual(gardenPlantGroups(groups).map(({ visible }) => visible), [4, 3, 5])
})

test('the illustration budget preserves quantities and reports every additional plant', () => {
  const groups = [{ quantity: 20 }, { quantity: 12 }, { quantity: 7 }]
  const result = allocatePlants(groups, 24)
  assert.deepEqual(result.map(({ visible }) => visible), [20, 4, 0])
  assert.equal(result.reduce((sum, group) => sum + group.additional, 0), 15)
  assert.equal(totalPlants(result), 39)
  assert.deepEqual(groups, [{ quantity: 20 }, { quantity: 12 }, { quantity: 7 }])
})

test('empty and zero-budget views remain valid', () => {
  assert.deepEqual(allocatePlants([], 24), [])
  assert.deepEqual(allocatePlants([{ quantity: 5 }], 0), [{ quantity: 5, visible: 0, additional: 5 }])
  assert.equal(totalPlants([]), 0)
})

test('each crop gets up to twelve drawings regardless of the other crops', () => {
  const groups = [{ quantity: 26 }, { quantity: 3 }, { quantity: 2 }, { quantity: 0 }, { quantity: 12 }]
  const result = gardenPlantGroups(groups)
  assert.deepEqual(result.map(({ visible }) => visible), [12, 3, 2, 0, 12])
  assert.deepEqual(result.map(({ additional }) => additional), [14, 0, 0, 0, 0])
  assert.equal(totalPlants(result), 43)
})

test('seedbed lots change from seeds to sprouts at the start of their second week', () => {
  const today = new Date(2026, 10, 12, 23, 45)
  assert.equal(seedbedStage('2026-11-12', today), 'germinating')
  assert.equal(seedbedStage('2026-11-06', today), 'germinating')
  assert.equal(seedbedStage('2026-11-05', today), 'grown')
  assert.equal(seedbedStage(null, today), 'grown')
})
