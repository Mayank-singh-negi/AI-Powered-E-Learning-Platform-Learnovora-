import { Switch, Route, useLocation } from 'wouter'
import { AuthProvider, useAuth } from './context/auth'
import LoginPage from './pages/Login'
import AdminShell from './pages/AdminShell'

function Guard() {
  const { admin, isLoading } = useAuth()
  const [, nav] = useLocation()
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!admin) { nav('/login'); return null }
  return <AdminShell />
}

export default function App() {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route><Guard /></Route>
      </Switch>
    </AuthProvider>
  )
}
