import { Switch, Route, Redirect } from 'wouter'
import { AuthProvider, useAuth } from './context/auth'
import LoginPage from './pages/Login'
import AdminShell from './pages/AdminShell'

function Guard() {
  const { admin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in → send to login (declarative redirect, no nav() in render)
  if (!admin) return <Redirect to="/login" />

  return <AdminShell />
}

function LoginRoute() {
  const { admin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Already logged in → go straight to dashboard
  if (admin) return <Redirect to="/" />

  return <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/login" component={LoginRoute} />
        <Route><Guard /></Route>
      </Switch>
    </AuthProvider>
  )
}
