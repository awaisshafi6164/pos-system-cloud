import { supabase } from "../supabaseClient";

// Returns room item_codes that are booked for the given date+time range (datetime overlap).
// Since check_in_date/check_out_date are date columns and time_in/time_out are text columns,
// we fetch invoices with overlapping dates then filter by time in JavaScript.

// ✅ #25 — Parse date+time strings as PKT (UTC+5:00) to avoid browser timezone bugs.
// new Date("2026-08-15T14:00:00") without a timezone suffix is ambiguous — browsers
// interpret it as local time, Node.js as UTC. This causes overlap detection to be wrong
// by 5 hours in Pakistan when running in different environments.
const parsePKT = (dateStr, timeStr) => {
  const date = String(dateStr || "").trim();
  const time = String(timeStr || "00:00").trim();
  return new Date(`${date}T${time}:00+05:00`); // explicit PKT offset
};
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

  // Build full datetime for the requested range using explicit PKT timezone
  const reqStart = parsePKT(checkInDate, timeIn || "00:00");
  const reqEnd = parsePKT(reqCheckOut, timeOut || "23:59");

  // Filter invoices by actual datetime overlap: existing_start < requested_end AND existing_end > requested_start
  const overlappingIds = invoices
    .filter((inv) => {
      const existStart = parsePKT(inv.check_in_date, inv.time_in || "00:00");
      const existEnd = parsePKT(inv.check_out_date, inv.time_out || "23:59");
      return existStart < reqEnd && existEnd > reqStart;
    })
    .map((inv) => inv.id);

  if (overlappingIds.length === 0) return { success: true, bookedRooms: [] };

  // ✅ #15 — Look up room item codes from the menu table using exact category match.
  // Previously used ilike "%room%" on item_name in invoice_items which would falsely
  // match items like "Mushroom Soup". Now we get authoritative room codes from menu.
  const { data: roomMenuItems, error: roomMenuError } = await supabase
    .from("menu")
    .select("item_code")
    .eq("business_id", businessId)
    .eq("item_category", "Room");

  if (roomMenuError) throw new Error(roomMenuError.message);

  const roomItemCodes = new Set((roomMenuItems || []).map((m) => String(m.item_code).trim()));

  // Now fetch items from overlapping invoices and filter by known room codes
  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("item_code")
    .in("invoice_id", overlappingIds);

  if (itemsError) throw new Error(itemsError.message);

  const codes = new Set();
  (items || []).forEach((it) => {
    const code = String(it?.item_code || "").trim();
    if (code && roomItemCodes.has(code)) codes.add(code);
  });

  return { success: true, bookedRooms: Array.from(codes) };
};

