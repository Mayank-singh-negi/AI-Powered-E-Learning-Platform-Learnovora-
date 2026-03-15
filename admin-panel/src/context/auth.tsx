import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api'

interface Admin { id: string; name: string; email: string; role: string; avatar?: string }
interface AuthCtx { admin: Admin | null; isLoading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void; updateAdmin: (updated: Partial<Admin>) => void }

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setIsLoading(false); return }
    api.get<Admin>('/auth/me')
      .then(u => {
        if (u.role !== 'admin') { localStorage.removeItem('adminToken'); setIsLoading(false); return }
        setAdmin(u)
      })
      .catch(() => localStorage.removeItem('adminToken'))
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const data = await api.post<{ accessToken: string }>('/auth/login', { email, password })
    localStorage.setItem('adminToken', data.accessToken)
    const profile = await api.get<Admin>('/auth/me')
    if (profile.role !== 'admin') {
      localStorage.removeItem('adminToken')
      throw new Error('Access denied. Admin accounts only.')
    }
    setAdmin(profile)
  }

  const logout = () => { localStorage.removeItem('adminToken'); setAdmin(null) }

  const updateAdmin = (updated: Partial<Admin>) => {
    setAdmin(prev => prev ? { ...prev, ...updated } : prev)
  }

  return <Ctx.Provider value={{ admin, isLoading, login, logout, updateAdmin }}>{children}</Ctx.Provider>
}

export const useAuth = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
