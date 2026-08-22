import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";

/**
 * Derives the next invoice number from the actual invoices table.
 *
 * Steps:
 *   1. Read prefix + pad config from invoice_counters (plain SELECT, RLS allows employees)
 *   2. Fetch all USINs for this business, strip the prefix, find the max numeric value
 *   3. Return prefix + (max + 1) zero-padded to pad digits
 *
 * Running entirely in JS under the user's JWT means RLS policies work correctly —
 * no DB function context issues with auth.uid() returning NULL.
 *
 * This is always in sync with reality — a failed save, a skipped number,
 * or a manual DB edit will never cause drift. No separate counter to maintain.
 */
export const getNextUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business_id");

  // 1. Read prefix + pad config (auto-create row if first time)
  let { data: config, error: configError } = await supabase
    .from("invoice_counters")
    .select("prefix, pad")
    .eq("business_id", businessId)
    .maybeSingle();

  if (configError) throw new Error(configError.message);

  if (!config) {
    // First time setup — create the config row with defaults
    const { data: newConfig, error: insertError } = await supabase
      .from("invoice_counters")
      .upsert(
        { business_id: businessId, next_number: 1, prefix: "", pad: 1, updated_at: new Date().toISOString() },
        { onConflict: "business_id", ignoreDuplicates: true }
      )
      .select("prefix, pad")
      .single();
    if (insertError) throw new Error(insertError.message);
    config = newConfig;
  }

  const prefix = config.prefix || "";
  const pad = config.pad || 1;

  // 2. Find the highest numeric suffix among all saved USINs for this business
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("usin")
    .eq("business_id", businessId);

  if (invoicesError) throw new Error(invoicesError.message);

  let maxNum = 0;
  for (const row of invoices || []) {
    const usin = row.usin || "";
    // Strip the prefix then parse the leading digits
    const stripped = prefix ? usin.slice(prefix.length) : usin;
    const match = stripped.match(/^(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  // 3. Format next number
  const next = maxNum + 1;
  return `${prefix}${String(next).padStart(pad, "0")}`;
};
