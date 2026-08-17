import { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { getProfile } from './services/authService'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Groups from './pages/Groups'
import Students from './pages/Students'
import Lectures from './pages/Lectures'
import Attendance from './pages/Attendance'
import Homework from './pages/Homework'
import Grades from './pages/Grades'
import Reports from './pages/Reports'
import Users from './pages/Users'
import DashboardLayout from './layouts/DashboardLayout'
import './styles/global.css'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function Protected() {
  const { loading, user } = useAuth()
  if (loading) return <div className="loading page-center">Loading...</div>
  return user ? <DashboardLayout /> : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="loading page-center">Loading...</div>
  return profile?.role === 'admin' ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refreshAuth() {
    const { data } = await supabase.auth.getSession()
    const u = data.session?.user || null
    setUser(u)
    if (u) {
      try {
        setProfile(await getProfile(u.id))
      } catch {
        setProfile(null)
      }
    } else {
      setProfile(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    refreshAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshAuth()
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshAuth }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route element={<Protected />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/students" element={<Students />} />
            <Route path="/lectures" element={<Lectures />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/homework" element={<Homework />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
