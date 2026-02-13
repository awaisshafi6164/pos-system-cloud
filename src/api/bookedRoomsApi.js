import { supabase } from "../supabaseClient";

// Returns room item_codes that are booked for the given date (inclusive overlap).
// Assumes room items in invoice_items have item_name containing "room".
export const getBookedRoomsForDate = async ({ businessId, checkInDate }) => {
  if (!businessId) throw new Error("Missing businessId");
  if (!checkInDate) return { success: true, bookedRooms: [] };

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id")
    .eq("business_id", businessId)
    .lte("check_in_date", checkInDate)
    .gte("check_out_date", checkInDate);

  if (invoicesError) throw new Error(invoicesError.message);

  const invoiceIds = (invoices || []).map((i) => i.id);
  if (invoiceIds.length === 0) return { success: true, bookedRooms: [] };

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("item_code, item_name")
    .in("invoice_id", invoiceIds)
    .ilike("item_name", "%room%");

  if (itemsError) throw new Error(itemsError.message);

  const codes = new Set();
  (items || []).forEach((it) => {
    const code = String(it?.item_code || "").trim();
    if (code) codes.add(code);
  });

  return { success: true, bookedRooms: Array.from(codes) };
};

