import { supabase } from '../lib/supabase'

export async function listHomework(groupIds = []) {
  let q = supabase
    .from('homework')
    .select('*, groups(id,name,instructor_id), profiles!homework_instructor_id_fkey(id,full_name,email,role)')
    .order('due_date', { ascending: true })
  if (groupIds.length) q = q.in('group_id', groupIds)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function createHomework(payload) {
  const { data, error } = await supabase
    .from('homework')
    .insert(payload)
    .select('*, groups(id,name,instructor_id), profiles!homework_instructor_id_fkey(id,full_name,email,role)')
    .single()
  if (error) throw error
  return data
}

export async function updateHomework(id, payload) {
  const { data, error } = await supabase
    .from('homework')
    .update(payload)
    .eq('id', id)
    .select('*, groups(id,name,instructor_id), profiles!homework_instructor_id_fkey(id,full_name,email,role)')
    .single()
  if (error) throw error
  return data
}

export async function listGrades(homeworkIds = []) {
  let q = supabase
    .from('grades')
    .select('*, students(id,full_name,group_id), homework(id,title,max_score,group_id,instructor_id,groups(id,name))')
    .order('created_at', { ascending: false })
  if (homeworkIds.length) q = q.in('homework_id', homeworkIds)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function upsertGrade(payload) {
  const { data, error } = await supabase
    .from('grades')
    .upsert(payload, { onConflict: 'homework_id,student_id' })
    .select('*, students(id,full_name,group_id), homework(id,title,max_score,group_id,instructor_id,groups(id,name))')
    .single()
  if (error) throw error
  return data
}
