import { supabase } from '../lib/supabase'

export async function listLectures(groupIds = []) {
  let q = supabase
    .from('lectures')
    .select('*, groups(id,name,instructor_id), profiles!lectures_instructor_id_fkey(id,full_name,email,role)')
    .order('lecture_date', { ascending: true })
    .order('start_time', { ascending: true })
  if (groupIds.length) q = q.in('group_id', groupIds)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function createLecture(payload) {
  const { data, error } = await supabase
    .from('lectures')
    .insert(payload)
    .select('*, groups(id,name,instructor_id), profiles!lectures_instructor_id_fkey(id,full_name,email,role)')
    .single()
  if (error) throw error
  return data
}

export async function updateLecture(id, payload) {
  const { data, error } = await supabase
    .from('lectures')
    .update(payload)
    .eq('id', id)
    .select('*, groups(id,name,instructor_id), profiles!lectures_instructor_id_fkey(id,full_name,email,role)')
    .single()
  if (error) throw error
  return data
}

export async function listAttendanceForLecture(lectureId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, students(id,full_name,group_id)')
    .eq('lecture_id', lectureId)
  if (error) throw error
  return data ?? []
}

export async function saveAttendance(records) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'lecture_id,student_id' })
    .select()
  if (error) throw error
  return data ?? []
}
