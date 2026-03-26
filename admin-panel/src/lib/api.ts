const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('adminToken')
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
    ...opts,
  })
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(res.status === 401 ? 'Invalid email or password.' : res.status === 404 ? 'Not found.' : `Server error (${res.status})`)
    throw new Error('Unexpected response from server')
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data as T
}

async function reqForm<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem('adminToken')
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`Server error (${res.status})`)
    throw new Error('Unexpected response from server')
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data as T
}

export const api = {
  get:       <T>(path: string)               => req<T>(path),
  post:      <T>(path: string, body: unknown) => req<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:       <T>(path: string, body?: unknown) => req<T>(path, { method: 'PUT',    body: body ? JSON.stringify(body) : undefined }),
  patch:     <T>(path: string, body?: unknown) => req<T>(path, { method: 'PATCH',  body: body ? JSON.stringify(body) : undefined }),
  delete:    <T>(path: string)               => req<T>(path, { method: 'DELETE' }),
  patchForm: <T>(path: string, formData: FormData) => reqForm<T>(path, formData),
}
