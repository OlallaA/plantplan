import test from 'node:test'
import assert from 'node:assert/strict'
import { gardenWeatherEffect } from '../src/lib/weather.js'

test('sun rays require clear conditions and daylight at the garden', () => {
  assert.equal(gardenWeatherEffect({ weatherCode: 0, daylight: true }), 'sun')
  assert.equal(gardenWeatherEffect({ weatherCode: 1, daylight: true }), 'sun')
  assert.equal(gardenWeatherEffect({ weatherCode: 0, daylight: false }), 'night')
  assert.equal(gardenWeatherEffect({ weatherCode: 0 }), null)
  assert.equal(gardenWeatherEffect({ weatherCode: 3, daylight: true }), 'clouds')
})

test('showers and thunderstorms with precipitation animate as rain', () => {
  assert.equal(gardenWeatherEffect({ weatherCode: 80, daylight: false }), 'rain')
  assert.equal(gardenWeatherEffect({ weatherCode: 95, precipitationMm: 2 }), 'rain')
  assert.equal(gardenWeatherEffect({ weatherCode: 95, precipitationMm: 0 }), 'clouds')
  assert.equal(gardenWeatherEffect({ weatherCode: 75, precipitationMm: 2 }), 'snow')
})

test('clouds and fog still have their own scene at night', () => {
  assert.equal(gardenWeatherEffect({ weatherCode: 2, daylight: false }), 'clouds')
  assert.equal(gardenWeatherEffect({ weatherCode: 45, daylight: false }), 'fog')
})
