import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";

/**
 * Derives the next invoice number from the actual invoices table.
 *
 * Calls the `get_next_usin` Postgres function which:
 *   1. Reads prefix + pad config from invoice_counters
 *   2. Scans the invoices table for the highest numeric USIN already saved
 *   3. Returns prefix + (max + 1) zero-padded to pad digits
 *
 * This is always in sync with reality — a failed save, a skipped number,
 * or a manual DB edit will never cause drift. No separate counter to maintain.
 */
export const getNextUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business_id");

  // Auto-create the config row if this business has never been set up
  const { data: existing } = await supabase
    .from("invoice_counters")
    .select("prefix, pad")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from("invoice_counters")
      .upsert(
        { business_id: businessId, next_number: 1, prefix: "", pad: 1, updated_at: new Date().toISOString() },
        { onConflict: "business_id", ignoreDuplicates: true }
      );
  }

  const { data, error } = await supabase.rpc("get_next_usin", {
    p_business_id: businessId,
  });

  if (error) throw new Error(`Failed to get next invoice number: ${error.message}`);
  if (!data) throw new Error("Invoice counter returned empty result");

  return data; // e.g. "STG-0026", "LR-1824", "CP-TY27-2"
};
