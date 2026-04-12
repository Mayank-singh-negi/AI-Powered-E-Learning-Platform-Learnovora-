import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api'

interface Admin { id: string; name: string; email: string; role: string; avatar?: string }

interface AuthCtx {
  admin: Admin | null
  isLoading: boolean
  sendOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, otp: string) => Promise<void>
  logout: () => void
  updateAdmin: (updated: Partial<Admin>) => void
}

const Ctx = createContext<AuthCtx | null>(null)

/** Decode JWT payload without verifying signature (client-side only) */
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: restore session from stored token
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setIsLoading(false); return }

    // Quick decode to check role before hitting the network
    const payload = decodeJwt(token)
    if (!payload || payload.role !== 'admin') {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminRefreshToken')
      setIsLoading(false)
      return
    }

    // Verify token is still valid with the server
    api.get<Admin>('/auth/me')
      .then(u => {
        if (u.role !== 'admin') {
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminRefreshToken')
          return
        }
        setAdmin(u)
      })
      .catch(() => {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminRefreshToken')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const sendOtp = async (email: string) => {
    await api.post('/admin/send-otp', { email })
  }

  const verifyOtp = async (email: string, otp: string) => {
    // 1. Exchange OTP for tokens
    const data = await api.post<{ accessToken: string; refreshToken: string }>(
      '/admin/verify-otp', { email, otp }
    )

    // 2. Persist tokens immediately so subsequent api calls include the header
    localStorage.setItem('adminToken', data.accessToken)
    localStorage.setItem('adminRefreshToken', data.refreshToken)

    // 3. Fetch full profile (token is now in localStorage, api.get will pick it up)
    const profile = await api.get<Admin>('/auth/me')

    if (profile.role !== 'admin') {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminRefreshToken')
      throw new Error('Access denied. Admin accounts only.')
    }

    // 4. Set state — App.tsx will reactively redirect away from /login
    setAdmin(profile)
  }

  const logout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminRefreshToken')
    setAdmin(null)
  }

  const updateAdmin = (updated: Partial<Admin>) =>
    setAdmin(prev => prev ? { ...prev, ...updated } : prev)

  return (
    <Ctx.Provider value={{ admin, isLoading, sendOtp, verifyOtp, logout, updateAdmin }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
