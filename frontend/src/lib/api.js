export async function apiRequest(path, { token, body, signal, method = body ? 'POST' : 'GET' } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status })
  }
  return response.json()
}

const sessionKey = 'plantplan.session'

export function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(sessionKey))
    return session?.token && session.user?.id ? session : null
  } catch {
    return null
  }
}

export function storeSession(session) {
  try {
    if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session))
    else sessionStorage.removeItem(sessionKey)
  } catch {
    // The current session still works in memory.
  }
}
