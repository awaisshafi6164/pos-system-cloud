import { supabase } from "../supabaseClient";

// Returns room item_codes that are booked for the given date+time range (datetime overlap).
// Since check_in_date/check_out_date are date columns and time_in/time_out are text columns,
// we fetch invoices with overlapping dates then filter by time in JavaScript.
export const getBookedRoomsForDate = async ({ businessId, checkInDate, checkOutDate, timeIn, timeOut }) => {
  if (!businessId) throw new Error("Missing businessId");
  if (!checkInDate) return { success: true, bookedRooms: [] };

  const reqCheckOut = checkOutDate || checkInDate;

  // Fetch invoices that overlap on the DATE range (broad filter):
  // existing.check_in_date <= requested.check_out_date AND existing.check_out_date >= requested.check_in_date
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, check_in_date, check_out_date, time_in, time_out")
    .eq("business_id", businessId)
    .lte("check_in_date", reqCheckOut)
    .gte("check_out_date", checkInDate);

  if (invoicesError) throw new Error(invoicesError.message);

  if (!invoices || invoices.length === 0) return { success: true, bookedRooms: [] };

  // Build full datetime for the requested range
  const reqStart = new Date(`${checkInDate}T${timeIn || "00:00"}:00`);
  const reqEnd = new Date(`${reqCheckOut}T${timeOut || "23:59"}:00`);

  // Filter invoices by actual datetime overlap: existing_start < requested_end AND existing_end > requested_start
  const overlappingIds = invoices
    .filter((inv) => {
      const existStart = new Date(`${inv.check_in_date}T${inv.time_in || "00:00"}:00`);
      const existEnd = new Date(`${inv.check_out_date}T${inv.time_out || "23:59"}:00`);
      // If same start and end (same-day same-time checkout), treat as a point in time
      // Overlap: existStart < reqEnd AND existEnd > reqStart
      return existStart < reqEnd && existEnd > reqStart;
    })
    .map((inv) => inv.id);

  if (overlappingIds.length === 0) return { success: true, bookedRooms: [] };

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("item_code, item_name")
    .in("invoice_id", overlappingIds)
    .ilike("item_name", "%room%");

  if (itemsError) throw new Error(itemsError.message);

  const codes = new Set();
  (items || []).forEach((it) => {
    const code = String(it?.item_code || "").trim();
    if (code) codes.add(code);
  });

  return { success: true, bookedRooms: Array.from(codes) };
};

