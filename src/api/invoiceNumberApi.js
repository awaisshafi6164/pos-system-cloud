import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";

/**
 * Gets the next invoice number formatted with prefix and padding.
 * ✅ Single round-trip: upsert with ignoreDuplicates ensures the row
 * exists, then a single select returns the current values.
 */
export const getNextUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business_id");

  // Insert default row only if it doesn't already exist (ignoreDuplicates = true)
  await supabase
    .from("invoice_counters")
    .upsert(
      { business_id: businessId, next_number: 1, prefix: "", pad: 1, updated_at: new Date().toISOString() },
      { onConflict: "business_id", ignoreDuplicates: true }
    );

  const { data, error } = await supabase
    .from("invoice_counters")
    .select("next_number, prefix, pad")
    .eq("business_id", businessId)
    .single();

  if (error) throw new Error(error.message);

  const { next_number, prefix, pad } = data;
  const paddedNum = String(next_number).padStart(pad || 1, "0");
  return `${prefix || ""}${paddedNum}`;
};

/**
 * Increments the invoice counter after a successful save.
 * ✅ Single atomic round-trip via Postgres function — no race conditions.
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
