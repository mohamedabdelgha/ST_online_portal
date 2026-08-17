import { supabase } from '../lib/supabase'

export async function listStudents(groupIds = []) {
  let q = supabase
    .from('students')
    .select('*, groups(id,name,instructor_id)')
    .order('full_name')
  if (groupIds.length) q = q.in('group_id', groupIds)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function createStudent(payload) {
  const { data, error } = await supabase
    .from('students')
    .insert(payload)
    .select('*, groups(id,name,instructor_id)')
    .single()
  if (error) throw error
  return data
}

export async function updateStudent(id, payload) {
  const { data, error } = await supabase
    .from('students')
    .update(payload)
    .eq('id', id)
    .select('*, groups(id,name,instructor_id)')
    .single()
  if (error) throw error
  return data
}
