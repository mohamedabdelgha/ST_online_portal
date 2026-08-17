import { useEffect,useState } from 'react'
import { useAuth } from '../App'
import { listGroups } from '../services/groupService'
import { listLectures,createLecture,updateLecture } from '../services/lectureService'
import Modal from '../components/Modal'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

const blank={group_id:'',title:'',description:'',lecture_date:new Date().toISOString().slice(0,10),start_time:'17:00',end_time:'18:00',meeting_link:'',status:'scheduled'}

export default function Lectures(){
  const {user,profile}=useAuth(); const isAdmin=profile?.role==='admin'
  const [groups,setGroups]=useState([]),[lectures,setLectures]=useState([]),[open,setOpen]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(blank),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){try{setLoading(true);setError('');const gs=await listGroups();setGroups(gs);setLectures(await listLectures(gs.map(g=>g.id)))}catch(e){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[profile?.id])
  function instructorForGroup(groupId){return groups.find(g=>String(g.id)===String(groupId))?.instructor_id||''}
  function startCreate(){setEditing(null);setForm({...blank,group_id:groups[0]?.id?String(groups[0].id):''});setOpen(true)}
  function startEdit(l){setEditing(l);setForm({group_id:String(l.group_id),title:l.title,description:l.description||'',lecture_date:l.lecture_date,start_time:l.start_time||'',end_time:l.end_time||'',meeting_link:l.meeting_link||'',status:l.status});setOpen(true)}
  async function submit(e){e.preventDefault();try{const group=groups.find(g=>String(g.id)===String(form.group_id));if(!group?.instructor_id)throw new Error('The selected group has no instructor. Assign one to the group first.');const payload={...form,group_id:Number(form.group_id),instructor_id:group.instructor_id};if(editing)await updateLecture(editing.id,payload);else await createLecture(payload);setOpen(false);await load()}catch(e){setError(e.message)}}
  if(loading)return <Loading/>; if(error&&!open)return <ErrorState message={error} onRetry={load}/>
  return <div><div className="page-heading"><div><h1>Lectures</h1><p>{isAdmin?'View and edit every lecture.':'Create and edit lectures for your groups.'}</p></div><button className="btn" onClick={startCreate}>+ New lecture</button></div>
    <div className="panel"><div className="table-wrap"><table><thead><tr><th>Group</th><th>Instructor</th><th>Title</th><th>Date</th><th>Time</th><th>Status</th><th></th></tr></thead><tbody>{lectures.map(l=><tr key={l.id}><td>{l.groups?.name}</td><td>{l.profiles?.full_name||'—'}</td><td>{l.title}</td><td>{l.lecture_date}</td><td>{l.start_time||'—'}</td><td><span className={`badge ${l.status}`}>{l.status}</span></td><td><button className="text-btn" onClick={()=>startEdit(l)}>Edit</button></td></tr>)}</tbody></table></div></div>
    {open&&<Modal title={editing?'Edit lecture':'Create lecture'} onClose={()=>setOpen(false)}><form onSubmit={submit} className="form-grid"><label>Group<select value={form.group_id} onChange={e=>setForm({...form,group_id:e.target.value})} required><option value="">Select group</option>{groups.map(g=><option value={g.id} key={g.id}>{g.name} — {g.profiles?.full_name||'No instructor'}</option>)}</select></label><label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/></label><label>Date<input type="date" value={form.lecture_date} onChange={e=>setForm({...form,lecture_date:e.target.value})} required/></label><label>Start<input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/></label><label>End<input type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label>Meeting link<input type="url" value={form.meeting_link} onChange={e=>setForm({...form,meeting_link:e.target.value})}/></label><label className="full">Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="btn">{editing?'Save changes':'Create'}</button></div></form></Modal>}
  </div>
}
