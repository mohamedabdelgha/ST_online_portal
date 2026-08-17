import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { listGroups, createGroup, updateGroup } from '../services/groupService'
import { listProfiles } from '../services/authService'
import Modal from '../components/Modal'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

const initial = { name: '', day: 'Saturday', time: '17:00', max_students: 20, status: 'active', instructor_id: '' }

export default function Groups() {
  const { user, profile } = useAuth()
  const [groups, setGroups] = useState([]), [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [open, setOpen] = useState(false), [editing, setEditing] = useState(null), [form, setForm] = useState(initial)
  const isAdmin = profile?.role === 'admin'

  async function load() {
    try {
      setLoading(true); setError('')
      const gs = await listGroups(); setGroups(gs)
      if (isAdmin) setInstructors((await listProfiles()).filter(x => x.role === 'instructor'))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [user?.id, isAdmin])

  function startCreate() {
    setEditing(null); setForm({ ...initial, instructor_id: isAdmin ? '' : user.id }); setOpen(true)
  }
  function startEdit(group) { setEditing(group); setForm({ name: group.name, day: group.day || 'Saturday', time: group.time || '17:00', max_students: group.max_students, status: group.status, instructor_id: group.instructor_id || '' }); setOpen(true) }

  async function submit(e) {
    e.preventDefault()
    try {
      const payload = { ...form, max_students: Number(form.max_students), instructor_id: isAdmin ? form.instructor_id : user.id }
      if (!payload.instructor_id) throw new Error('Please select an instructor.')
      if (editing) await updateGroup(editing.id, payload); else await createGroup(payload)
      setOpen(false); await load()
    } catch (e) { setError(e.message) }
  }

  if (loading) return <Loading />
  if (error && !open) return <ErrorState message={error} onRetry={load} />
  return <div>
    <div className="page-heading"><div><h1>{isAdmin ? 'All Groups' : 'My Groups'}</h1><p>{isAdmin ? 'View and edit every group.' : 'Manage only the groups assigned to you.'}</p></div><button className="btn" onClick={startCreate}>+ New group</button></div>
    <div className="card-grid">{groups.map(g => <div className="group-card" key={g.id}><div className="group-top"><h3>{g.name}</h3><span className={`badge ${g.status}`}>{g.status}</span></div><p>{g.day} · {g.time}</p><p>Instructor: {g.profiles?.full_name || 'Unassigned'}</p><p>Capacity: {g.max_students}</p><button className="text-btn" onClick={() => startEdit(g)}>Edit</button></div>)}</div>
    {open && <Modal title={editing ? 'Edit group' : 'Create group'} onClose={() => setOpen(false)}><form onSubmit={submit} className="form-grid"><label>Group name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label><label>Day<select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'].map(d => <option key={d}>{d}</option>)}</select></label><label>Time<input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></label><label>Max students<input type="number" min="1" value={form.max_students} onChange={e => setForm({ ...form, max_students: e.target.value })} /></label><label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="paused">Paused</option><option value="closed">Closed</option></select></label>{isAdmin && <label>Instructor<select value={form.instructor_id} onChange={e => setForm({ ...form, instructor_id: e.target.value })} required><option value="">Select instructor</option>{instructors.map(i => <option key={i.id} value={i.id}>{i.full_name} ({i.email || 'no email'})</option>)}</select></label>}<div className="form-actions"><button className="btn secondary" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="btn">{editing ? 'Save changes' : 'Create'}</button></div></form></Modal>}
  </div>
}
