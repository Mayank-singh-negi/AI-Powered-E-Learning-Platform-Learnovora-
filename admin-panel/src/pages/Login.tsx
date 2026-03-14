import { useState } from 'react'
import { useLocation } from 'wouter'
import { motion } from 'framer-motion'
import { Mail, Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react'
import { useAuth } from '@/context/auth'

export default function LoginPage() {
  const [, nav] = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiErr, setApiErr] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setApiErr('')
    try { await login(form.email, form.password); nav('/') }
    catch (err: unknown) { setApiErr(err instanceof Error ? err.message : 'Login failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#003330] to-slate-900 p-4">
      <motion.div className="w-full max-w-sm" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand/40">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm mt-1">Learnovora — Admin Access Only</p>
        </div>

        <div className="bg-white rounded-2xl p-7 shadow-2xl shadow-black/30">
          {apiErr && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">{apiErr}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <div className="relative">
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="admin@example.com"
                  className="w-full pl-4 pr-10 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition" />
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Enter password"
                  className="w-full pl-4 pr-10 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-light transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in...</>
                : <><Lock size={15} /> Sign In to Admin</>}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">Only accounts with admin role can access this panel.</p>
      </motion.div>
    </div>
  )
}
