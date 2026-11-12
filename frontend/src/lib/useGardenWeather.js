import { useEffect, useState } from 'react'
import { apiRequest } from './api.js'

const loading = { status: 'loading' }
const refreshIntervalMs = 5 * 60 * 1000

export default function useGardenWeather({ id, latitude, longitude }, token, onSignOut) {
  const [result, setResult] = useState(loading)
  const [attempt, setAttempt] = useState(0)
  const hasCoordinates = latitude != null && longitude != null

  useEffect(() => {
    if (!token || !hasCoordinates) return
    const controller = new AbortController()
    let refreshTimer

    async function refresh() {
      try {
        const forecast = await apiRequest(`/gardens/${id}/weather`, { token, signal: controller.signal })
        if (!controller.signal.aborted) setResult({ status: 'ready', forecast })
      } catch (failure) {
        if (controller.signal.aborted) return
        if (failure.status === 401) {
          onSignOut(true, token)
          return
        }
        setResult((previous) => previous.forecast ? { ...previous, status: 'stale' } : { status: 'error' })
      }
      if (!controller.signal.aborted) refreshTimer = window.setTimeout(refresh, refreshIntervalMs)
    }

    refresh()
    return () => {
      controller.abort()
      window.clearTimeout(refreshTimer)
    }
  }, [attempt, hasCoordinates, id, onSignOut, token])

  function retry() {
    setResult((previous) => previous.forecast ? previous : loading)
    setAttempt((previous) => previous + 1)
  }

  return { ...result, hasCoordinates, retry }
}
