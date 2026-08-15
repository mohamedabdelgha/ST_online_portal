import { supabase } from '../lib/supabase'

export async function listGroups(instructorId) {
  let q = supabase.from('groups').select('*').order('created_at', { ascending: false })
  if (instructorId) q = q.eq('instructor_id', instructorId)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function createGroup(payload) {
  const { data, error } = await supabase.from('groups').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateGroup(id, payload) {
  const { data, error } = await supabase.from('groups').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}
