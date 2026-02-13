import { supabase } from "../supabaseClient";

const toDbRow = (form, businessId) => ({
  business_id: businessId,
  item_code: String(form.itemCode || "").trim(),
  item_name: String(form.itemName || "").trim(),
  item_category: String(form.itemCategory || "").trim(),
  item_price: Number(form.itemPrice || 0),
  stock_qty: form.stockQty === "" || form.stockQty === null || form.stockQty === undefined ? null : Number(form.stockQty),
  date_modified: new Date().toISOString(),
});

const fromDbRow = (row) => ({
  id: row.id,
  itemCode: row.item_code ?? "",
  itemName: row.item_name ?? "",
  itemCategory: row.item_category ?? "",
  itemPrice: row.item_price ?? "",
  stockQty: row.stock_qty ?? "",
  date_modified: row.date_modified ?? null,
});

export const listMenuItems = async (businessId) => {
  const { data, error } = await supabase
    .from("menu")
    .select("id, item_code, item_name, item_category, item_price, stock_qty, date_modified")
    .eq("business_id", businessId)
    .order("item_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map(fromDbRow);
};

export const createMenuItem = async (form, businessId) => {
  const row = toDbRow(form, businessId);
  if (!row.item_code) throw new Error("Item code is required.");
  if (!row.item_name) throw new Error("Item name is required.");
  if (!row.item_category) throw new Error("Category is required.");

  const { data, error } = await supabase
    .from("menu")
    .insert([row])
    .select("id, item_code, item_name, item_category, item_price, stock_qty, date_modified")
    .single();

  if (error) throw new Error(error.message);
  return fromDbRow(data);
};

export const updateMenuItem = async (id, form, businessId) => {
  const row = toDbRow(form, businessId);
  delete row.business_id;

  const { data, error } = await supabase
    .from("menu")
    .update(row)
    .eq("id", id)
    .eq("business_id", businessId)
    .select("id, item_code, item_name, item_category, item_price, stock_qty, date_modified")
    .single();

  if (error) throw new Error(error.message);
  return fromDbRow(data);
};

export const deleteMenuItem = async (id, businessId) => {
  const { error } = await supabase.from("menu").delete().eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
  return { success: true };
};

export const getCategoriesFromMenuItems = (items) => {
  const set = new Set();
  (items || []).forEach((item) => {
    const c = String(item?.itemCategory || "").trim();
    if (c) set.add(c);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};
