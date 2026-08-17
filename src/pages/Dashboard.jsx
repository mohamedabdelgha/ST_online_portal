import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { listGroups } from '../services/groupService'
import { listStudents } from '../services/studentService'
import { listLectures } from '../services/lectureService'
import { listHomework } from '../services/homeworkService'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function Dashboard() {
  const { profile } = useAuth()
  const [data, setData] = useState({ groups: [], students: [], lectures: [], homework: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      setLoading(true); setError('')
      const groups = await listGroups()
      const ids = groups.map(g => g.id)
      const [students, lectures, homework] = await Promise.all([
        listStudents(ids), listLectures(ids), listHomework(ids)
      ])
      setData({ groups, students, lectures, homework })
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [profile?.id])
  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />

  const today = new Date().toISOString().slice(0, 10)
  const todayLectures = data.lectures.filter(l => l.lecture_date === today)

  return <div>
    <div className="page-heading">
      <div><h1>{profile?.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}</h1><p>{profile?.role === 'admin' ? 'Manage the whole education operation.' : 'Manage your groups, students and teaching activity.'}</p></div>
    </div>
    <div className="stats-grid">
      <div className="stat-card"><span>Total groups</span><strong>{data.groups.length}</strong></div>
      <div className="stat-card"><span>Total students</span><strong>{data.students.length}</strong></div>
      <div className="stat-card"><span>Today's lectures</span><strong>{todayLectures.length}</strong></div>
      <div className="stat-card"><span>Homework</span><strong>{data.homework.length}</strong></div>
    </div>
    <div className="panel">
      <div className="panel-head"><h3>Today's lectures</h3><span>{today}</span></div>
      {todayLectures.length === 0 ? <div className="empty">No lectures scheduled today.</div> : <div className="table-wrap"><table><thead><tr><th>Group</th><th>Instructor</th><th>Title</th><th>Start</th><th>Status</th></tr></thead><tbody>
        {todayLectures.map(l => <tr key={l.id}><td>{l.groups?.name}</td><td>{l.profiles?.full_name || '—'}</td><td>{l.title}</td><td>{l.start_time || '—'}</td><td><span className={`badge ${l.status}`}>{l.status}</span></td></tr>)}
      </tbody></table></div>}
    </div>
  </div>
}
