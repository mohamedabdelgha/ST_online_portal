import { supabase } from "../lib/supabase";
export async function listStock() {
  const { data, error } = await supabase
    .from("stock")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function createStockItem(item) {
  const { data, error } = await supabase
    .from("stock")
    .insert([
      {
        name: item.name,
        category: item.category,
        sku: item.sku,
        quantity: Number(item.quantity),
        minimum_quantity: Number(item.minimum_quantity),
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateStockItem(id, item) {
  const { data, error } = await supabase
    .from("stock")
    .update({
      name: item.name,
      category: item.category,
      sku: item.sku,
      quantity: Number(item.quantity),
      minimum_quantity: Number(item.minimum_quantity),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteStockItem(id) {
  const { error } = await supabase
    .from("stock")
    .delete()
    .eq("id", id);

  if (error) throw error;
}