import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ShieldCheck, ArrowRight, RefreshCw, CheckCircle2, KeyRound } from 'lucide-react'
import { useAuth } from '@/context/auth'
import { Logo } from '@/components/Logo'

const RESEND_COOLDOWN = 60 // seconds

export default function LoginPage() {
  const { sendOtp, verifyOtp } = useAuth()

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState('')

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const [loading, setLoading] = useState(false)
  const [apiErr, setApiErr] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const validateEmail = () => {
    if (!email.trim()) { setEmailErr('Email is required'); return false }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailErr('Enter a valid email'); return false }
    setEmailErr('')
    return true
  }

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!validateEmail()) return
    setLoading(true); setApiErr('')
    try {
      await sendOtp(email.trim().toLowerCase())
      setStep('otp')
      setCountdown(RESEND_COOLDOWN)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const handleOtpChange = (idx: number, val: string) => {
    // Accept only digits
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[idx] = digit
    setOtp(next)
    setApiErr('')
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpRefs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...otp]
    pasted.split('').forEach((d, i) => { if (i < 6) next[i] = d })
    setOtp(next)
    const focusIdx = Math.min(pasted.length, 5)
    otpRefs.current[focusIdx]?.focus()
  }

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setApiErr('Enter all 6 digits'); return }
    // Guard against concurrent calls (auto-submit + button click)
    if (loading) return
    setLoading(true); setApiErr('')
    try {
      await verifyOtp(email.trim().toLowerCase(), code)
      // ✅ No nav() here — App.tsx watches admin state and redirects automatically
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : 'Verification failed')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } finally { setLoading(false) }
  }

  // Auto-submit when all 6 digits filled — guarded against double-fire
  useEffect(() => {
    if (step === 'otp' && otp.every(d => d !== '') && !loading) {
      handleVerify()
    }
  }, [otp]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0f1f3d] to-slate-900 p-4">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" theme="dark" />
          </div>
          <p className="text-slate-400 text-sm mt-1.5">Admin Panel — Secure OTP Login</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">

          {/* Step indicator */}
          <div className="flex border-b border-slate-100">
            {(['email', 'otp'] as const).map((s, i) => (
              <div key={s} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors ${step === s ? 'text-brand border-b-2 border-brand' : 'text-slate-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? 'bg-brand text-white' : step === 'otp' && i === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {step === 'otp' && i === 0 ? <CheckCircle2 size={12} /> : i + 1}
                </span>
                {s === 'email' ? 'Enter Email' : 'Verify OTP'}
              </div>
            ))}
          </div>

          <div className="p-9">
            <AnimatePresence mode="wait">

              {/* ── Step 1: Email ── */}
              {step === 'email' && (
                <motion.div key="email" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-900">Sign in to Admin</h2>
                    <p className="text-slate-500 text-sm mt-1">We'll send a one-time password to your admin email.</p>
                  </div>

                  {apiErr && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{apiErr}</div>
                  )}

                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Admin Email</label>
                      <div className="relative">
                        <input
                          type="email" value={email}
                          onChange={e => { setEmail(e.target.value); setEmailErr('') }}
                          placeholder="admin@learnovora.com" autoFocus
                          className={`w-full pl-4 pr-10 py-3.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition ${emailErr ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-brand/50 focus:ring-brand/10'}`}
                        />
                        <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                      {emailErr && <p className="mt-1 text-xs text-red-500">{emailErr}</p>}
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-light transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {loading
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending OTP...</>
                        : <><ArrowRight size={16} /> Send OTP</>}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── Step 2: OTP ── */}
              {step === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-900">Enter OTP</h2>
                    <p className="text-slate-500 text-sm mt-1">
                      A 6-digit code was sent to <span className="font-semibold text-slate-700">{email}</span>
                    </p>
                  </div>

                  {apiErr && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                      {apiErr}
                    </motion.div>
                  )}

                  <form onSubmit={handleVerify} className="space-y-5">
                    {/* OTP boxes */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-3 text-center">6-Digit OTP</label>
                      <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                        {otp.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={el => { otpRefs.current[idx] = el }}
                            type="text" inputMode="numeric" maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(idx, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(idx, e)}
                            className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-all ${
                              digit ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10'
                            } ${apiErr ? 'border-red-300 bg-red-50' : ''}`}
                            style={{ height: '52px' }}
                          />
                        ))}
                      </div>
                      <p className="text-center text-xs text-slate-400 mt-2">Expires in 5 minutes</p>
                    </div>

                    <button type="submit" disabled={loading || otp.some(d => !d)}
                      className="w-full py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-light transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {loading
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</>
                        : <><KeyRound size={16} /> Verify & Sign In</>}
                    </button>

                    {/* Resend + back */}
                    <div className="flex items-center justify-between pt-1">
                      <button type="button" onClick={() => { setStep('email'); setApiErr(''); setOtp(['','','','','','']) }}
                        className="text-xs text-slate-400 hover:text-slate-600 transition">
                        ← Change email
                      </button>

                      {countdown > 0 ? (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <RefreshCw size={11} /> Resend in {countdown}s
                        </span>
                      ) : (
                        <button type="button" onClick={handleSendOtp} disabled={loading}
                          className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 disabled:opacity-50">
                          <RefreshCw size={11} /> Resend OTP
                        </button>
                      )}
                    </div>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          🔒 Passwordless login — only registered admin emails can access this panel.
        </p>
      </motion.div>
    </div>
  )
}
