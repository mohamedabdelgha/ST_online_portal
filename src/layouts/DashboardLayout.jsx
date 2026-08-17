import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { signOut } from '../services/authService'
import './DashboardLayout.css'

const baseNav = [
  ['Dashboard', '/dashboard'],
  ['Groups', '/groups'],
  ['Students', '/students'],
  ['Lectures', '/lectures'],
  ['Attendance', '/attendance'],
  ['Homework', '/homework'],
  ['Grades', '/grades'],
  ['Reports', '/reports'],
]

export default function DashboardLayout() {
  const { profile, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const nav = profile?.role === 'admin' ? [...baseNav, ['Users', '/users']] : baseNav

  async function logout() {
    await signOut()
    await refreshAuth()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">IP</div>
          <div><strong>Instructor</strong><span>Portal</span></div>
        </div>
        <div className="role-chip">{profile?.role === 'admin' ? 'Administrator' : 'Instructor'}</div>
        <nav className="nav-list">
          {nav.map(([label, path]) => (
            <NavLink key={path} to={path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>Log out</button>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <h2>{profile?.full_name || 'User'}</h2>
            <small>{profile?.role === 'admin' ? 'Administrator workspace' : 'Instructor workspace'}</small>
          </div>
          <div className="user-pill">
            <div className="avatar">{(profile?.full_name || 'U').slice(0, 1).toUpperCase()}</div>
            <div><strong>{profile?.full_name || 'User'}</strong><small>{profile?.email || ''}</small></div>
          </div>
        </header>
        <main className="page-container"><Outlet /></main>
      </div>
    </div>
  )
}
