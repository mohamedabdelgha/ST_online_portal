import { supabase } from '../lib/supabase'

export async function listGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*, profiles!groups_instructor_id_fkey(id,full_name,email,role)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createGroup(payload) {
  const { data, error } = await supabase
    .from('groups')
    .insert(payload)
    .select('*, profiles!groups_instructor_id_fkey(id,full_name,email,role)')
    .single()
  if (error) throw error
  return data
}

export async function updateGroup(id, payload) {
  const { data, error } = await supabase
    .from('groups')
    .update(payload)
    .eq('id', id)
    .select('*, profiles!groups_instructor_id_fkey(id,full_name,email,role)')
    .single()
  if (error) throw error
  return data
}
