import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Users, FileCheck, Trash2,
  CheckCircle2, XCircle, LogOut, Menu, X, Bell,
  TrendingUp, GraduationCap, BookMarked, ChevronRight,
  ShieldCheck, Search, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/context/auth'
import { api } from '@/lib/api'

/* ── Types ── */
interface Stats { totalUsers: number; totalStudents: number; totalTeachers: number; totalCourses: number; publishedCourses: number; totalEnrollments: number; averageCompletion: number }
interface Course { _id: string; title: string; description: string; status: string; isPublished: boolean; averageRating: number; teacher?: { name: string; email: string }; createdAt: string }
interface User { _id: string; name: string; email: string; role: string; createdAt: string }

const NAV = [
  { id: 'overview',  label: 'Overview',         icon: LayoutDashboard },
  { id: 'pending',   label: 'Pending Courses',   icon: FileCheck },
  { id: 'courses',   label: 'All Courses',       icon: BookOpen },
  { id: 'users',     label: 'Users',             icon: Users },
]

const STATUS_STYLE: Record<string, string> = {
  draft:    'bg-slate-100 text-slate-500',
  pending:  'bg-amber-50 text-amber-600',
  approved: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-red-50 text-red-500',
}

export default function AdminShell() {
  const { admin, logout } = useAuth()
  const [tab, setTab] = useState('overview')
  const [sidebar, setSidebar] = useState(false)

  const [stats, setStats]           = useState<Stats | null>(null)
  const [pending, setPending]       = useState<Course[]>([])
  const [courses, setCourses]       = useState<Course[]>([])
  const [users, setUsers]           = useState<User[]>([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [confirmDel, setConfirmDel] = useState<{ type: 'course' | 'user'; id: string; name: string } | null>(null)
  const [actionMsg, setActionMsg]   = useState<{ id: string; msg: string } | null>(null)

  useEffect(() => {
    setSearch('')
    if (tab === 'overview') load(() => api.get<Stats>('/admin/dashboard').then(setStats))
    if (tab === 'pending')  load(() => api.get<Course[]>('/admin/pending-courses').then(setPending))
    if (tab === 'courses')  load(() => api.get<Course[]>('/admin/courses').then(setCourses))
    if (tab === 'users')    load(() => api.get<User[]>('/admin/users').then(setUsers))
  }, [tab])

  const load = async (fn: () => Promise<void>) => { setLoading(true); try { await fn() } catch {} finally { setLoading(false) } }

  const flash = (id: string, msg: string) => { setActionMsg({ id, msg }); setTimeout(() => setActionMsg(null), 3000) }

  const approveCourse = async (id: string) => {
    try { await api.put(`/admin/approve/${id}`); flash(id, 'approved'); load(() => api.get<Course[]>('/admin/pending-courses').then(setPending)) }
    catch (err: unknown) { flash(id, err instanceof Error ? err.message : 'Failed') }
  }

  const rejectCourse = async (id: string) => {
    try { await api.put(`/admin/reject/${id}`); flash(id, 'rejected'); load(() => api.get<Course[]>('/admin/pending-courses').then(setPending)) }
    catch (err: unknown) { flash(id, err instanceof Error ? err.message : 'Failed') }
  }

  const deleteCourse = async (id: string) => {
    try { await api.delete(`/admin/courses/${id}`); setCourses(p => p.filter(c => c._id !== id)); setConfirmDel(null) }
    catch (err: unknown) { flash(id, err instanceof Error ? err.message : 'Failed') }
  }

  const deleteUser = async (id: string) => {
    try { await api.delete(`/admin/users/${id}`); setUsers(p => p.filter(u => u._id !== id)); setConfirmDel(null) }
    catch (err: unknown) { flash(id, err instanceof Error ? err.message : 'Failed') }
  }

  const switchTab = (id: string) => { setTab(id); setSidebar(false) }

  const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
  const filteredUsers   = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 flex flex-col transition-transform duration-300 ${sidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shrink-0">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">Learnovora</p>
            <p className="text-slate-400 text-xs">Admin Panel</p>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setSidebar(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <button key={item.id} onClick={() => switchTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? 'bg-brand text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <item.icon size={17} />
              {item.label}
              {item.id === 'pending' && pending.length > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand/30 flex items-center justify-center text-brand-light font-bold text-sm shrink-0">
              {admin?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{admin?.name}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {sidebar && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebar(false)} />}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-5 sticky top-0 z-30 shrink-0">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebar(true)}><Menu size={22} /></button>
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'users' ? 'Search users...' : 'Search courses...'}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-brand/40 transition" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setTab(t => t); load(() => Promise.resolve()) }} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition" title="Refresh">
              <RefreshCw size={17} />
            </button>
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
              <Bell size={19} />
              {pending.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
              {admin?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

              {/* ── Overview ── */}
              {tab === 'overview' && (
                <div>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
                    <p className="text-slate-500 text-sm mt-1">Platform-wide statistics at a glance</p>
                  </div>

                  {loading ? <StatsSkeleton /> : stats ? (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                          { label: 'Total Users',       value: stats.totalUsers,                          icon: Users,        color: 'bg-blue-50 text-blue-600',    border: 'border-blue-100' },
                          { label: 'Students',          value: stats.totalStudents,                       icon: GraduationCap,color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
                          { label: 'Teachers',          value: stats.totalTeachers,                       icon: BookMarked,   color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
                          { label: 'Total Courses',     value: stats.totalCourses,                        icon: BookOpen,     color: 'bg-teal-50 text-teal-600',     border: 'border-teal-100' },
                          { label: 'Published Courses', value: stats.publishedCourses,                    icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600',border: 'border-emerald-100' },
                          { label: 'Total Enrollments', value: stats.totalEnrollments,                    icon: TrendingUp,   color: 'bg-amber-50 text-amber-600',   border: 'border-amber-100' },
                          { label: 'Avg Completion',    value: `${Math.round(stats.averageCompletion)}%`, icon: ChevronRight, color: 'bg-rose-50 text-rose-600',     border: 'border-rose-100' },
                          { label: 'Pending Review',    value: pending.length,                            icon: FileCheck,    color: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
                        ].map((s, i) => (
                          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            className={`bg-white rounded-2xl p-5 border ${s.border}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}><s.icon size={19} /></div>
                            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                          </motion.div>
                        ))}
                      </div>

                      {/* Quick actions */}
                      <div className="grid sm:grid-cols-3 gap-4">
                        {[
                          { label: 'Review Pending Courses', desc: `${pending.length} awaiting approval`, icon: FileCheck, color: 'bg-amber-500', tab: 'pending' },
                          { label: 'Manage All Courses',     desc: `${stats.totalCourses} total courses`,  icon: BookOpen,  color: 'bg-brand',    tab: 'courses' },
                          { label: 'Manage Users',           desc: `${stats.totalUsers} registered users`, icon: Users,     color: 'bg-blue-500', tab: 'users' },
                        ].map(a => (
                          <motion.button key={a.tab} whileHover={{ y: -2 }} onClick={() => switchTab(a.tab)}
                            className="w-full text-left bg-white rounded-2xl p-5 border border-slate-200 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5 transition-all group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${a.color}`}><a.icon size={19} className="text-white" /></div>
                            <p className="font-bold text-slate-900 text-sm mb-1">{a.label}</p>
                            <p className="text-xs text-slate-500">{a.desc}</p>
                            <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-brand opacity-0 group-hover:opacity-100 transition-opacity">Open <ChevronRight size={12} /></div>
                          </motion.button>
                        ))}
                      </div>
                    </>
                  ) : <Empty icon={LayoutDashboard} title="Could not load stats" desc="Make sure the backend is running." />}
                </div>
              )}

              {/* ── Pending Courses ── */}
              {tab === 'pending' && (
                <div>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Pending Courses</h1>
                    <p className="text-slate-500 text-sm mt-1">{pending.length} course{pending.length !== 1 ? 's' : ''} awaiting your review</p>
                  </div>
                  {loading ? <ListSkeleton /> : pending.length === 0
                    ? <Empty icon={FileCheck} title="All caught up!" desc="No courses pending review right now." />
                    : (
                      <div className="space-y-3">
                        {pending.map((c, i) => (
                          <motion.div key={c._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-2xl border border-slate-200 p-5">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><FileCheck size={18} className="text-amber-600" /></div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-sm mb-1">{c.title}</h3>
                                <p className="text-xs text-slate-500 line-clamp-2 mb-2">{c.description || 'No description.'}</p>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                  {c.teacher && <span className="flex items-center gap-1"><GraduationCap size={12} /> {c.teacher.name}</span>}
                                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                                {actionMsg?.id === c._id && (
                                  <p className={`mt-2 text-xs font-semibold ${actionMsg.msg === 'approved' ? 'text-emerald-600' : actionMsg.msg === 'rejected' ? 'text-red-500' : 'text-red-500'}`}>
                                    {actionMsg.msg === 'approved' ? '✓ Approved' : actionMsg.msg === 'rejected' ? '✗ Rejected' : actionMsg.msg}
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

              {/* ── All Courses ── */}
              {tab === 'courses' && (
                <div>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">All Courses</h1>
                    <p className="text-slate-500 text-sm mt-1">{courses.length} total courses across all statuses</p>
                  </div>
                  {loading ? <GridSkeleton /> : filteredCourses.length === 0
                    ? <Empty icon={BookOpen} title="No courses found" desc={search ? 'Try a different search.' : 'No courses in the system yet.'} />
                    : (
                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredCourses.map((c, i) => (
                          <motion.div key={c._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0"><BookOpen size={18} className="text-brand" /></div>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[c.status] ?? 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug">{c.title}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 flex-1 mb-3">{c.description || 'No description.'}</p>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <div className="text-xs text-slate-400">
                                {c.teacher ? <span className="flex items-center gap-1"><GraduationCap size={11} /> {c.teacher.name}</span> : '—'}
                              </div>
                              <button onClick={() => setConfirmDel({ type: 'course', id: c._id, name: c.title })}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* ── Users ── */}
              {tab === 'users' && (
                <div>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Users</h1>
                    <p className="text-slate-500 text-sm mt-1">{users.length} registered users</p>
                  </div>
                  {loading ? <ListSkeleton /> : filteredUsers.length === 0
                    ? <Empty icon={Users} title="No users found" desc={search ? 'Try a different search.' : 'No users registered yet.'} />
                    : (
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Joined</th>
                              <th className="px-5 py-3" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((u, i) => (
                              <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs shrink-0">
                                      {u.name[0]?.toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-slate-800">{u.name}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">{u.email}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${u.role === 'admin' ? 'bg-red-50 text-red-600' : u.role === 'teacher' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
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

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Confirm Delete</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                Are you sure you want to delete <span className="font-semibold text-slate-700">"{confirmDel.name}"</span>? This action cannot be undone.
              </p>
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
    </div>
  )
}

/* ── Skeleton loaders ── */
function StatsSkeleton() {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array(8).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse h-28" />)}</div>
}
function ListSkeleton() {
  return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-200 animate-pulse h-24" />)}</div>
}
function GridSkeleton() {
  return <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array(6).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-200 animate-pulse h-40" />)}</div>
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
