const BASE = '/api/v1'

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
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data as T
}

export const api = {
  get:    <T>(path: string)              => req<T>(path),
  post:   <T>(path: string, body: unknown) => req<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body?: unknown)=> req<T>(path, { method: 'PUT',    body: body ? JSON.stringify(body) : undefined }),
  patch:  <T>(path: string, body?: unknown)=> req<T>(path, { method: 'PATCH',  body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string)              => req<T>(path, { method: 'DELETE' }),
}
