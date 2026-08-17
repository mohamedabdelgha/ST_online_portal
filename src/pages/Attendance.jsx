import { useEffect, useState } from 'react'; 
import { useAuth } from '../App'; 
import { listGroups } from '../services/groupService'; 
import { listLectures, listAttendanceForLecture, saveAttendance } from '../services/lectureService'; 
import { listStudents } from '../services/studentService'; 
import Loading from '../components/Loading'; 
import ErrorState from '../components/ErrorState'
export default function Attendance() {
    const { profile } = useAuth();
    const [groups, setGroups] = useState([]), 
        [lectures, setLectures] = useState([]), 
        [students, setStudents] = useState([]), 
        [selectedGroup, setSelectedGroup] = useState(''), 
        [selectedLecture, setSelectedLecture] = useState(''), 
        [status, setStatus] = useState({}), 
        [loading, setLoading] = useState(true), 
        [error, setError] = useState(''); 
    async function load() {
        try {
            setLoading(true);
            setError(''); 
            const gs = await listGroups(); 
            setGroups(gs); 
            const ids = gs.map(g => g.id); 
            const [ls, ss] = await Promise.all([listLectures(ids), listStudents(ids)]); 
            setLectures(ls); 
            setStudents(ss); 
            setSelectedGroup(gs[0] ? String(gs[0].id) : '') 
        } catch (e) { setError(e.message) }
        finally {
            setLoading(false) 
        } 
    } 
    useEffect(() => { load() }, [profile?.id]); 
    const groupStudents = students.filter(s => String(s.group_id) === selectedGroup); 
    const groupLectures = lectures.filter(l => String(l.group_id) === selectedGroup); 
    useEffect(() => { setSelectedLecture(groupLectures[0] ? String(groupLectures[0].id) : '') }, 
    [selectedGroup, lectures.length]); 
    useEffect(() => {
        async function fetchAttendance() {
            if (!selectedLecture) return;
            try { 
                const rows = await listAttendanceForLecture(Number(selectedLecture)); 
                setStatus(Object.fromEntries(rows.map(r => [r.student_id, r.status]))) 
            } catch (e) { setError(e.message) } 
        } 
        fetchAttendance() 
    }, 
    [selectedLecture]);
    async function submit() {
        
        try { await saveAttendance(groupStudents.map(s => ({ lecture_id: Number(selectedLecture), student_id: s.id, status: status[s.id] || 'absent' }))); alert('Attendance saved.') } catch (e) { setError(e.message) } } if (loading) return <Loading />; if (error) return <ErrorState message={error} onRetry={load} />; return <div><div className="page-heading"><div><h1>Attendance</h1><p>{profile?.role === 'admin' ? 'View and edit attendance for every group.' : 'Take and update attendance for your groups.'}</p></div></div><div className="toolbar"><select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}><option value="">Select group</option>{groups.map(g => <option value={g.id} key={g.id}>{g.name}</option>)}</select><select value={selectedLecture} onChange={e => setSelectedLecture(e.target.value)}><option value="">Select lecture</option>{groupLectures.map(l => <option value={l.id} key={l.id}>{l.lecture_date} · {l.title}</option>)}</select><button className="btn secondary" onClick={() => setStatus(Object.fromEntries(groupStudents.map(s => [s.id, 'present'])))}>Mark all present</button><button className="btn" onClick={submit} disabled={!selectedLecture}>Save attendance</button></div><div className="panel"><div className="table-wrap"><table><thead><tr><th>Student</th><th>Status</th></tr></thead><tbody>{groupStudents.map(s => <tr key={s.id}><td>{s.full_name}</td><td><select value={status[s.id] || 'absent'} onChange={e => setStatus({ ...status, [s.id]: e.target.value })}><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option></select></td></tr>)}</tbody></table></div></div></div> }
