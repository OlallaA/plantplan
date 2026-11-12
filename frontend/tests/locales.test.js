import test from 'node:test'
import assert from 'node:assert/strict'
import es from '../src/locales/es.json' with { type: 'json' }
import gl from '../src/locales/gl.json' with { type: 'json' }

function messageKeys(catalog, prefix = '') {
  return Object.entries(catalog).flatMap(([key, value]) => {
    const path = `${prefix}${key}`
    return typeof value === 'string' ? [path] : messageKeys(value, `${path}.`)
  })
}

test('Galician and Spanish provide the same messages and plural forms', () => {
  assert.deepEqual(messageKeys(gl).sort(), messageKeys(es).sort())
})
