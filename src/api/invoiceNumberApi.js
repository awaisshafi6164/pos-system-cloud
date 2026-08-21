import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";

/**
 * Reads the current next invoice number WITHOUT incrementing.
 * Used on page load and after reset to pre-fill the invoice number field.
 */
export const getNextUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business_id");

  const { data, error } = await supabase
    .from("invoice_counters")
    .select("next_number, prefix, pad")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  // Auto-create counter row if it doesn't exist yet
  if (!data) {
    const { data: newRow, error: insertError } = await supabase
      .from("invoice_counters")
      .upsert(
        { business_id: businessId, next_number: 1, prefix: "", pad: 1, updated_at: new Date().toISOString() },
        { onConflict: "business_id", ignoreDuplicates: true }
      )
      .select("next_number, prefix, pad")
      .single();

    if (insertError) throw new Error(insertError.message);
    const { next_number, prefix, pad } = newRow;
    return `${prefix || ""}${String(next_number).padStart(pad || 1, "0")}`;
  }

  const { next_number, prefix, pad } = data;
  return `${prefix || ""}${String(next_number).padStart(pad || 1, "0")}`;
};

/**
 * Atomically claims the next invoice number AND increments the counter
 * in a single SQL transaction — no race condition possible.
 *
 * Uses the `get_and_increment_usin` Postgres RPC which does:
 *   UPDATE invoice_counters SET next_number = next_number + 1
 *   RETURNING next_number - 1  (the number that was just consumed)
 *
 * Returns the formatted USIN string (e.g. "LR-0007").
 * Throws if the counter row doesn't exist for this business.
 */
export const getAndIncrementUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business_id");

  const { data, error } = await supabase.rpc("get_and_increment_usin", {
    p_business_id: businessId,
  });

  if (error) throw new Error(`Failed to get invoice number: ${error.message}`);
  if (!data) throw new Error("Invoice counter returned empty result");

  return data; // already formatted by the RPC, e.g. "LR-0007"
};

/**
 * @deprecated Use getAndIncrementUsin() instead.
 * Kept only so any remaining call sites don't break at runtime.
 * Will be removed once all usages are migrated.
 */
export const incrementUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) return;

  const { error } = await supabase.rpc("increment_invoice_counter", {
    p_business_id: businessId,
  });

  if (error) {
    console.error("Failed to increment invoice counter:", error.message);
  }
};
