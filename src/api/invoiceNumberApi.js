import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";

/**
 * Reads the current next invoice number WITHOUT incrementing.
 * Called on page load to pre-fill the invoice number field.
 * The actual increment happens in incrementUsin() after a successful save.
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
 * Atomically increments the counter after a successful save.
 * Uses a Postgres RPC to avoid race conditions between concurrent cashiers.
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
