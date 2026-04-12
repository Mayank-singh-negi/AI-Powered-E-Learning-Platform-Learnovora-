import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Users, FileCheck, Trash2, CheckCircle2, XCircle,
  LogOut, Menu, X, Bell, TrendingUp, GraduationCap, BookMarked, ChevronRight,
  ShieldCheck, Search, RefreshCw, AlertTriangle, Film, User, Upload, BarChart3,
  Activity, Star, Filter,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useAuth } from '@/context/auth'
import { api } from '@/lib/api'
import { Logo } from '@/components/Logo'

/* ── Types ── */
interface Stats {
  totalUsers: number; totalStudents: number; totalTeachers: number
  totalCourses: number; publishedCourses: number; totalEnrollments: number
  averageCompletion: number; pendingContent: number
}
interface Course {
  _id: string; title: string; description: string; status: string
  isPublished: boolean; averageRating: number; thumbnail?: string
  teacher?: { name: string; email: string }; createdAt: string
}
interface UserRow { _id: string; name: string; email: string; role: string; createdAt: string }
interface PendingContent {
  _id: string; title: string; type: string; url: string; approvalStatus: string; createdAt: string
  course?: { _id: string; title: string; teacher?: { name: string; email: string } }
}
interface ChartPoint { month: string; enrollments: number; courses: number }
interface RolePoint { name: string; value: number; color: string }

const NAV = [
  { id: 'overview',        label: 'Overview',         icon: LayoutDashboard },
  { id: 'analytics',       label: 'Analytics',        icon: BarChart3 },
  { id: 'pending',         label: 'Pending Courses',  icon: FileCheck },
  { id: 'pending-content', label: 'Content Approval', icon: Film },
  { id: 'courses',         label: 'All Courses',       icon: BookOpen },
  { id: 'users',           label: 'Users',             icon: Users },
  { id: 'profile',         label: 'Profile',           icon: User },
]

const STATUS_STYLE: Record<string, string> = {
  draft:    'bg-slate-100 text-slate-500',
  pending:  'bg-amber-50 text-amber-600 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  rejected: 'bg-red-50 text-red-500 border border-red-200',
}

const BRAND = '#0ea5e9'

export default function AdminShell() {
  const { admin, logout, updateAdmin } = useAuth()
  const [tab, setTab] = useState('overview')
  const [sidebar, setSidebar] = useState(false)

  const [stats, setStats]                     = useState<Stats | null>(null)
  const [pending, setPending]                 = useState<Course[]>([])
  const [pendingContents, setPendingContents] = useState<PendingContent[]>([])
  const [courses, setCourses]                 = useState<Course[]>([])
  const [users, setUsers]                     = useState<UserRow[]>([])
  const [chartData, setChartData]             = useState<ChartPoint[]>([])
  const [roleData, setRoleData]               = useState<RolePoint[]>([])
  const [loading, setLoading]                 = useState(false)
  const [search, setSearch]                   = useState('')
  const [roleFilter, setRoleFilter]           = useState('all')
  const [confirmDel, setConfirmDel]           = useState<{ type: 'course' | 'user'; id: string; name: string } | null>(null)
  const [actionMsg, setActionMsg]             = useState<{ id: string; msg: string } | null>(null)
  const [rejectModal, setRejectModal]         = useState<{ id: string; title: string } | null>(null)
  const [rejectReason, setRejectReason]       = useState('')
  const [notifOpen, setNotifOpen]             = useState(false)
  const [toast, setToast]                     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const notifRef                              = useRef<HTMLDivElement>(null)

  const totalNotifs = pending.length + pendingContents.length

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const load = async (fn: () => Promise<void>) => {
    setLoading(true); try { await fn() } catch {} finally { setLoading(false) }
  }

  const loadTab = (t: string) => {
    setSearch(''); setRoleFilter('all')
    if (t === 'overview')        load(() => api.get<Stats>('/admin/dashboard').then(setStats))
    if (t === 'analytics')       load(() => api.get<{ chartData: ChartPoint[]; roleData: RolePoint[] }>('/admin/analytics').then(d => { setChartData(d.chartData); setRoleData(d.roleData) }))
    if (t === 'pending')         load(() => api.get<Course[]>('/admin/pending-courses').then(setPending))
    if (t === 'pending-content') load(() => api.get<PendingContent[]>('/admin/pending-content').then(setPendingContents))
    if (t === 'courses')         load(() => api.get<Course[]>('/admin/courses').then(setCourses))
    if (t === 'users')           load(() => api.get<UserRow[]>('/admin/users').then(setUsers))
  }

  useEffect(() => { loadTab(tab) }, [tab])

  useEffect(() => {
    api.get<Course[]>('/admin/pending-courses').then(setPending).catch(() => {})
    api.get<PendingContent[]>('/admin/pending-content').then(setPendingContents).catch(() => {})
  }, [])

  const flash = (id: string, msg: string) => { setActionMsg({ id, msg }); setTimeout(() => setActionMsg(null), 3000) }

  const approveCourse = async (id: string) => {
    try { await api.put(`/admin/approve/${id}`); flash(id, 'approved'); showToast('Course approved — teacher notified'); load(() => api.get<Course[]>('/admin/pending-courses').then(setPending)) }
    catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed', 'error') }
  }
  const rejectCourse = async (id: string, reason = '') => {
    try { await api.put(`/admin/reject/${id}`, { reason }); flash(id, 'rejected'); showToast('Course rejected — teacher notified'); load(() => api.get<Course[]>('/admin/pending-courses').then(setPending)) }
    catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed', 'error') }
  }
  const approveContent = async (id: string) => {
    try { await api.put(`/admin/content/approve/${id}`); flash(id, 'approved'); showToast('Content approved'); load(() => api.get<PendingContent[]>('/admin/pending-content').then(setPendingContents)) }
    catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed', 'error') }
  }
  const rejectContent = async (id: string, reason: string) => {
    try { await api.put(`/admin/content/reject/${id}`, { reason }); flash(id, 'rejected'); setRejectModal(null); setRejectReason(''); showToast('Content rejected'); load(() => api.get<PendingContent[]>('/admin/pending-content').then(setPendingContents)) }
    catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed', 'error') }
  }
  const deleteCourse = async (id: string) => {
    try { await api.delete(`/admin/courses/${id}`); setCourses(p => p.filter(c => c._id !== id)); setConfirmDel(null); showToast('Course deleted') }
    catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed', 'error') }
  }
  const deleteUser = async (id: string) => {
    try { await api.delete(`/admin/users/${id}`); setUsers(p => p.filter(u => u._id !== id)); setConfirmDel(null); showToast('User deleted') }
    catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  const switchTab = (id: string) => { setTab(id); setSidebar(false) }

  const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
  const filteredUsers   = users.filter(u =>
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
    (roleFilter === 'all' || u.role === roleFilter)
  )

  return (
    <div className="min-h-screen flex bg-[#f1f5f9]">

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-300 ${sidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
          <Logo size="sm" theme="dark" />
          <button className="lg:hidden text-slate-400 hover:text-white transition ml-auto" onClick={() => setSidebar(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
          {NAV.map(item => (
            <button key={item.id} onClick={() => switchTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                tab === item.id
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
              }`}>
              <item.icon size={17} className="shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'pending' && pending.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
              )}
              {item.id === 'pending-content' && pendingContents.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingContents.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-2">
            {admin?.avatar ? (
              <img src={admin.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {admin?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{admin?.name}</p>
              <p className="text-[11px] text-slate-400">Administrator</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/15 hover:text-red-400 transition-colors">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {sidebar && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebar(false)} />}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-5 sticky top-0 z-30 shrink-0 shadow-sm">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebar(true)}><Menu size={22} /></button>
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={tab === 'users' ? 'Search users...' : 'Search courses...'}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10 transition" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => loadTab(tab)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition" title="Refresh">
              <RefreshCw size={17} />
            </button>
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(o => !o)} className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
                <Bell size={19} />
                {totalNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                    {totalNotifs}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <p className="font-semibold text-slate-800 text-sm">Notifications</p>
                      {totalNotifs > 0 && <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">{totalNotifs} pending</span>}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                      {pending.length === 0 && pendingContents.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">All caught up! 🎉</div>
                      ) : (
                        <>
                          {pending.map(c => (
                            <button key={c._id} onClick={() => { switchTab('pending'); setNotifOpen(false) }}
                              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5"><FileCheck size={14} className="text-amber-600" /></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{c.title}</p>
                                <p className="text-xs text-amber-600 mt-0.5">Course pending approval</p>
                              </div>
                            </button>
                          ))}
                          {pendingContents.map(c => (
                            <button key={c._id} onClick={() => { switchTab('pending-content'); setNotifOpen(false) }}
                              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
                              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 mt-0.5"><Film size={14} className="text-rose-500" /></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{c.title}</p>
                                <p className="text-xs text-rose-500 mt-0.5">Content pending review</p>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => switchTab('profile')} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition">
              {admin?.avatar ? (
                <img src={admin.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {admin?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

              {/* ══════════════════════════════════════════════════════
                  OVERVIEW TAB
              ══════════════════════════════════════════════════════ */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
                    <p className="text-slate-500 text-sm mt-1">Welcome back, {admin?.name?.split(' ')[0]} 👋 — here's what's happening today.</p>
                  </div>

                  {/* Pending Actions Banner */}
                  {(pending.length > 0 || pendingContents.length > 0) && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-lg shadow-amber-500/20">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <AlertTriangle size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">Action Required</p>
                          <p className="text-white/80 text-xs mt-0.5">
                            {pending.length > 0 && `${pending.length} course${pending.length > 1 ? 's' : ''} pending approval`}
                            {pending.length > 0 && pendingContents.length > 0 && ' · '}
                            {pendingContents.length > 0 && `${pendingContents.length} content item${pendingContents.length > 1 ? 's' : ''} to review`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {pending.length > 0 && (
                          <button onClick={() => switchTab('pending')}
                            className="px-4 py-2 bg-white text-amber-600 text-xs font-bold rounded-xl hover:bg-amber-50 transition">
                            Review Courses →
                          </button>
                        )}
                        {pendingContents.length > 0 && (
                          <button onClick={() => switchTab('pending-content')}
                            className="px-4 py-2 bg-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/30 transition">
                            Review Content →
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Stats Grid */}
                  {loading ? <StatsSkeleton /> : stats ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Users',       value: stats.totalUsers,                          icon: Users,        grad: 'from-blue-500 to-indigo-600',   light: 'bg-blue-50',    text: 'text-blue-600' },
                        { label: 'Students',          value: stats.totalStudents,                       icon: GraduationCap,grad: 'from-violet-500 to-purple-600',  light: 'bg-violet-50',  text: 'text-violet-600' },
                        { label: 'Teachers',          value: stats.totalTeachers,                       icon: BookMarked,   grad: 'from-amber-500 to-orange-500',   light: 'bg-amber-50',   text: 'text-amber-600' },
                        { label: 'Total Courses',     value: stats.totalCourses,                        icon: BookOpen,     grad: 'from-teal-500 to-cyan-600',      light: 'bg-teal-50',    text: 'text-teal-600' },
                        { label: 'Published',         value: stats.publishedCourses,                    icon: CheckCircle2, grad: 'from-emerald-500 to-green-600',  light: 'bg-emerald-50', text: 'text-emerald-600' },
                        { label: 'Enrollments',       value: stats.totalEnrollments,                    icon: TrendingUp,   grad: 'from-sky-500 to-blue-600',       light: 'bg-sky-50',     text: 'text-sky-600' },
                        { label: 'Avg Completion',    value: `${Math.round(stats.averageCompletion)}%`, icon: Activity,     grad: 'from-rose-500 to-pink-600',      light: 'bg-rose-50',    text: 'text-rose-600' },
                        { label: 'Pending Review',    value: pending.length + (stats.pendingContent ?? 0), icon: FileCheck, grad: 'from-orange-500 to-red-500',    light: 'bg-orange-50',  text: 'text-orange-600' },
                      ].map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          whileHover={{ y: -3, scale: 1.02 }}
                          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-300 cursor-default">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-4 shadow-lg`}>
                            <s.icon size={20} className="text-white" />
                          </div>
                          <p className="text-2xl font-bold text-slate-900 mb-0.5">{s.value}</p>
                          <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                        </motion.div>
                      ))}
                    </div>
                  ) : <Empty icon={LayoutDashboard} title="Could not load stats" desc="Make sure the backend is running." />}

                  {/* Quick Actions */}
                  {stats && (
                    <div>
                      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: 'Pending Courses',  desc: `${pending.length} awaiting approval`,           icon: FileCheck, grad: 'from-amber-500 to-orange-500', tab: 'pending' },
                          { label: 'Content Review',   desc: `${stats.pendingContent ?? 0} items to review`,  icon: Film,      grad: 'from-rose-500 to-pink-600',    tab: 'pending-content' },
                          { label: 'All Courses',      desc: `${stats.totalCourses} total courses`,            icon: BookOpen,  grad: 'from-teal-500 to-cyan-600',    tab: 'courses' },
                          { label: 'Manage Users',     desc: `${stats.totalUsers} registered users`,           icon: Users,     grad: 'from-blue-500 to-indigo-600',  tab: 'users' },
                        ].map(a => (
                          <motion.button key={a.tab} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={() => switchTab(a.tab)}
                            className="w-full text-left bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-300 group">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.grad} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                              <a.icon size={20} className="text-white" />
                            </div>
                            <p className="font-bold text-slate-900 text-sm mb-1">{a.label}</p>
                            <p className="text-xs text-slate-500">{a.desc}</p>
                            <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              Open <ChevronRight size={12} />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  ANALYTICS TAB
              ══════════════════════════════════════════════════════ */}
              {tab === 'analytics' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                    <p className="text-slate-500 text-sm mt-1">Platform growth and engagement over the last 6 months</p>
                  </div>

                  {loading ? (
                    <div className="grid md:grid-cols-2 gap-6">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 animate-pulse h-72" />)}</div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">

                      {/* Enrollments Trend — Line Chart */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center"><TrendingUp size={16} className="text-sky-600" /></div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">Enrollments Trend</p>
                            <p className="text-xs text-slate-400">Monthly new enrollments</p>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Area type="monotone" dataKey="enrollments" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#enrollGrad)" dot={{ fill: '#0ea5e9', r: 4 }} activeDot={{ r: 6 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Courses Growth — Bar Chart */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><BarChart3 size={16} className="text-violet-600" /></div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">Courses Created</p>
                            <p className="text-xs text-slate-400">Monthly new courses</p>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="courseGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#6366f1" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Bar dataKey="courses" fill="url(#courseGrad)" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Users Distribution — Donut Chart */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><Users size={16} className="text-amber-600" /></div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">User Distribution</p>
                            <p className="text-xs text-slate-400">By role breakdown</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <ResponsiveContainer width="55%" height={180}>
                            <PieChart>
                              <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                {roleData.map((entry, index) => (
                                  <Cell key={index} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-3 flex-1">
                            {roleData.map(r => (
                              <div key={r.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: r.color }} />
                                <span className="text-xs text-slate-600 flex-1">{r.name}</span>
                                <span className="text-xs font-bold text-slate-800">{r.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Combined Overview — Line Chart */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Activity size={16} className="text-emerald-600" /></div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">Platform Activity</p>
                            <p className="text-xs text-slate-400">Enrollments vs Courses</p>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="enrollments" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Enrollments" />
                            <Line type="monotone" dataKey="courses" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Courses" strokeDasharray="5 5" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  PENDING COURSES TAB
              ══════════════════════════════════════════════════════ */}
              {tab === 'pending' && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pending Courses</h1>
                    <p className="text-slate-500 text-sm mt-1">{pending.length} course{pending.length !== 1 ? 's' : ''} awaiting your review · Teacher receives email on decision</p>
                  </div>
                  {loading ? <ListSkeleton /> : pending.length === 0
                    ? <Empty icon={FileCheck} title="All caught up!" desc="No courses pending review right now." />
                    : (
                      <div className="space-y-3">
                        {pending.map((c, i) => (
                          <motion.div key={c._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="flex items-start gap-4 p-5">
                              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                <FileCheck size={20} className="text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-sm mb-1">{c.title}</h3>
                                <p className="text-xs text-slate-500 line-clamp-2 mb-2">{c.description || 'No description.'}</p>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                  {c.teacher && (
                                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                                      <GraduationCap size={11} /> {c.teacher.name}
                                      <span className="text-slate-300">·</span> {c.teacher.email}
                                    </span>
                                  )}
                                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                                {actionMsg?.id === c._id && (
                                  <p className={`mt-2 text-xs font-semibold ${actionMsg.msg === 'approved' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {actionMsg.msg === 'approved' ? '✓ Approved — email sent to teacher' : '✗ Rejected — email sent to teacher'}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button onClick={() => approveCourse(c._id)}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-xl hover:bg-emerald-100 transition">
                                  <CheckCircle2 size={14} /> Approve
                                </button>
                                <button onClick={() => rejectCourse(c._id)}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 text-xs font-semibold rounded-xl hover:bg-red-100 transition">
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  CONTENT APPROVAL TAB
              ══════════════════════════════════════════════════════ */}
              {tab === 'pending-content' && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Content Approval</h1>
                    <p className="text-slate-500 text-sm mt-1">{pendingContents.length} item{pendingContents.length !== 1 ? 's' : ''} awaiting review</p>
                  </div>
                  {loading ? <ListSkeleton /> : pendingContents.length === 0
                    ? <Empty icon={Film} title="All caught up!" desc="No content pending review right now." />
                    : (
                      <div className="space-y-3">
                        {pendingContents.map((c, i) => (
                          <motion.div key={c._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center shrink-0"><Film size={20} className="text-rose-500" /></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-slate-900 text-sm">{c.title}</h3>
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{c.type}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-2">
                                  {c.course && <span className="flex items-center gap-1"><BookOpen size={11} /> {c.course.title}</span>}
                                  {c.course?.teacher && <span className="flex items-center gap-1"><GraduationCap size={11} /> {c.course.teacher.name}</span>}
                                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                                {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-600 font-semibold hover:underline">Preview ↗</a>}
                                {actionMsg?.id === c._id && (
                                  <p className={`mt-2 text-xs font-semibold ${actionMsg.msg === 'approved' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {actionMsg.msg === 'approved' ? '✓ Approved' : '✗ Rejected'}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button onClick={() => approveContent(c._id)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-xl hover:bg-emerald-100 transition"><CheckCircle2 size={14} /> Approve</button>
                                <button onClick={() => { setRejectModal({ id: c._id, title: c.title }); setRejectReason('') }} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 text-xs font-semibold rounded-xl hover:bg-red-100 transition"><XCircle size={14} /> Reject</button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  ALL COURSES TAB
              ══════════════════════════════════════════════════════ */}
              {tab === 'courses' && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">All Courses</h1>
                    <p className="text-slate-500 text-sm mt-1">{courses.length} total courses across all statuses</p>
                  </div>
                  {loading ? <GridSkeleton /> : filteredCourses.length === 0
                    ? <Empty icon={BookOpen} title="No courses found" desc={search ? 'Try a different search.' : 'No courses in the system yet.'} />
                    : (
                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredCourses.map((c, i) => (
                          <motion.div key={c._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            whileHover={{ y: -4 }}
                            className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300">
                            {/* Thumbnail */}
                            <div className="relative h-44 bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden shrink-0">
                              {c.thumbnail ? (
                                <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen size={44} className="text-white/15" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                              <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full capitalize shadow-sm ${STATUS_STYLE[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                {c.isPublished ? '🟢 Live' : c.status}
                              </span>
                              {c.averageRating > 0 && (
                                <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg">
                                  <Star size={11} className="text-amber-400" fill="currentColor" />
                                  <span className="text-white text-xs font-bold">{c.averageRating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                            {/* Body */}
                            <div className="p-4 flex flex-col flex-1">
                              <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1">{c.title}</h3>
                              <p className="text-xs text-slate-500 line-clamp-2 flex-1 mb-3">{c.description || 'No description.'}</p>
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                                  <GraduationCap size={12} className="shrink-0" />
                                  <span className="truncate">{c.teacher?.name ?? '—'}</span>
                                </div>
                                <button onClick={() => setConfirmDel({ type: 'course', id: c._id, name: c.title })}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  USERS TAB
              ══════════════════════════════════════════════════════ */}
              {tab === 'users' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">Users</h1>
                      <p className="text-slate-500 text-sm mt-1">{users.length} registered users</p>
                    </div>
                    {/* Role filter */}
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-slate-400" />
                      {['all', 'student', 'teacher', 'admin'].map(r => (
                        <button key={r} onClick={() => setRoleFilter(r)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition capitalize ${roleFilter === r ? 'bg-sky-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-sky-300'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? <ListSkeleton /> : filteredUsers.length === 0
                    ? <Empty icon={Users} title="No users found" desc={search ? 'Try a different search.' : 'No users registered yet.'} />
                    : (
                      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Joined</th>
                              <th className="px-5 py-3.5" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map((u, i) => (
                              <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                      {u.name[0]?.toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-slate-800 text-sm">{u.name}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-slate-500 text-sm hidden sm:table-cell">{u.email}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' : u.role === 'teacher' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-slate-400 text-xs hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="px-5 py-3.5 text-right">
                                  {u.role !== 'admin' && (
                                    <button onClick={() => setConfirmDel({ type: 'user', id: u._id, name: u.name })}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                </div>
              )}

              {/* Profile */}
              {tab === 'profile' && <AdminProfileTab admin={admin} updateAdmin={updateAdmin} logout={logout} />}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} className="text-red-500" /></div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Confirm Delete</h3>
              <p className="text-sm text-slate-500 text-center mb-6">Delete <span className="font-semibold text-slate-700">"{confirmDel.name}"</span>? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition text-sm">Cancel</button>
                <button onClick={() => confirmDel.type === 'course' ? deleteCourse(confirmDel.id) : deleteUser(confirmDel.id)}
                  className="flex-1 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition text-sm flex items-center justify-center gap-2">
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject Content Modal ── */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><XCircle size={24} className="text-red-500" /></div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Reject Content</h3>
              <p className="text-sm text-slate-500 text-center mb-4">Rejecting <span className="font-semibold text-slate-700">"{rejectModal.title}"</span></p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional — teacher will see this)" rows={3}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-red-300 resize-none" />
              <div className="flex gap-3">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition text-sm">Cancel</button>
                <button onClick={() => rejectContent(rejectModal.id, rejectReason)}
                  className="flex-1 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition text-sm flex items-center justify-center gap-2">
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Admin Profile Tab ── */
function AdminProfileTab({ admin, updateAdmin, logout }: {
  admin: { id: string; name: string; email: string; role: string; avatar?: string } | null
  updateAdmin: (u: { name?: string; avatar?: string }) => void
  logout: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(admin?.name ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(admin?.avatar ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f))
  }

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      if (avatarFile) fd.append('avatar', avatarFile)
      const updated = await api.patchForm<{ id: string; name: string; email: string; role: string; avatar: string }>('/auth/profile', fd)
      updateAdmin({ name: updated.name, avatar: updated.avatar })
      setMsg('saved'); setEditing(false); setAvatarFile(null)
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const avatar = avatarPreview || admin?.avatar || ''

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your admin account</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="h-28 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #0ea5e9 0%, transparent 50%), radial-gradient(circle at 80% 50%, #8b5cf6 0%, transparent 50%)' }} />
        </div>
        <div className="px-6 pb-6">
          <div className="relative w-20 h-20 -mt-10 mb-4">
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-xl" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 border-4 border-white shadow-xl flex items-center justify-center text-white font-bold text-2xl">
                {admin?.name?.[0]?.toUpperCase() ?? 'A'}
              </div>
            )}
            {editing && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl cursor-pointer hover:bg-black/60 transition">
                <Upload size={18} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            )}
          </div>

          {editing ? (
            <div className="mb-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-400/50 transition" />
              </div>
              {msg && msg !== 'saved' && <p className="text-xs text-red-500">{msg}</p>}
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-600 transition disabled:opacity-60">
                  {saving ? 'Saving...' : <><CheckCircle2 size={14} /> Save</>}
                </button>
                <button onClick={() => { setEditing(false); setName(admin?.name ?? ''); setAvatarFile(null); setAvatarPreview(admin?.avatar ?? '') }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-slate-900">{admin?.name}</h2>
                <button onClick={() => { setEditing(true); setMsg(''); setName(admin?.name ?? '') }}
                  className="text-xs text-sky-500 font-semibold hover:underline">Edit</button>
              </div>
              <p className="text-sm text-slate-500 mb-5">{admin?.email}</p>
              {msg === 'saved' && <p className="text-xs text-emerald-600 mb-3 font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Profile updated</p>}
            </>
          )}

          <div className="divide-y divide-slate-100">
            {[
              { icon: User, label: 'Full Name', value: admin?.name ?? '—' },
              { icon: ShieldCheck, label: 'Role', value: 'Administrator' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 py-3">
                <row.icon size={15} className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 w-24 shrink-0">{row.label}</span>
                <span className="text-sm font-semibold text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <button onClick={logout} className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-100 transition">
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Skeleton loaders ── */
function StatsSkeleton() {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array(8).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse h-28" />)}</div>
}
function ListSkeleton() {
  return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 animate-pulse h-24" />)}</div>
}
function GridSkeleton() {
  return <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{Array(6).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 animate-pulse h-52" />)}</div>
}
function Empty({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="text-center py-20">
      <Icon size={44} className="mx-auto text-slate-300 mb-4" />
      <h3 className="text-base font-semibold text-slate-600 mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  )
}
