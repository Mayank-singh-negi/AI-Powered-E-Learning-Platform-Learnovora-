const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

async function refreshAdminToken(): Promise<string> {
  const refreshToken = localStorage.getItem('adminRefreshToken')
  if (!refreshToken) throw new Error('No refresh token')

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Session expired')

  localStorage.setItem('adminToken', data.accessToken)
  if (data.refreshToken) localStorage.setItem('adminRefreshToken', data.refreshToken)
  return data.accessToken
}

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('adminToken')
  const isFormData = opts?.body instanceof FormData

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers as Record<string, string> ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  // Auto-refresh on 401
  if (res.status === 401) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push((newToken) => {
          req<T>(path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` } })
            .then(resolve).catch(reject)
        })
      })
    }
    isRefreshing = true
    try {
      const newToken = await refreshAdminToken()
      refreshQueue.forEach(cb => cb(newToken))
      refreshQueue = []
      isRefreshing = false
      const retryRes = await fetch(`${BASE}${path}`, {
        ...opts,
        headers: {
          ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
          Authorization: `Bearer ${newToken}`,
        },
      })
      const retryData = await retryRes.json()
      if (!retryRes.ok) throw new Error(retryData.message || 'Request failed')
      return retryData as T
    } catch (err) {
      isRefreshing = false
      refreshQueue = []
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminRefreshToken')
      window.location.href = '/login'
      throw err
    }
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(res.status === 404 ? 'Not found.' : `Server error (${res.status})`)
    throw new Error('Unexpected response from server')
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data as T
}

async function reqForm<T>(path: string, formData: FormData): Promise<T> {
  return req<T>(path, { method: 'PATCH', body: formData })
}

export const api = {
  get:       <T>(path: string)                => req<T>(path),
  post:      <T>(path: string, body: unknown)  => req<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:       <T>(path: string, body?: unknown) => req<T>(path, { method: 'PUT',    body: body ? JSON.stringify(body) : undefined }),
  patch:     <T>(path: string, body?: unknown) => req<T>(path, { method: 'PATCH',  body: body ? JSON.stringify(body) : undefined }),
  delete:    <T>(path: string)                => req<T>(path, { method: 'DELETE' }),
  patchForm: <T>(path: string, formData: FormData) => reqForm<T>(path, formData),
}
