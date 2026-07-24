import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";

/**
 * Ensures an invoice_counters row exists for the current business.
 * If missing, creates one with next_number = 1.
 * Returns the row { next_number, prefix, pad }.
 */
const ensureCounterRow = async (businessId) => {
  const { data, error } = await supabase
    .from("invoice_counters")
    .select("next_number, prefix, pad")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data) return data;

  // Row doesn't exist — create it with next_number = 1
  const { data: newRow, error: insertError } = await supabase
    .from("invoice_counters")
    .upsert(
      { business_id: businessId, next_number: 1, prefix: "", pad: 1, updated_at: new Date().toISOString() },
      { onConflict: "business_id" }
    )
    .select("next_number, prefix, pad")
    .single();

  if (insertError) throw new Error(insertError.message);
  return newRow;
};

/**
 * Gets the next invoice number formatted with prefix and padding.
 * Auto-creates the counter row if it doesn't exist.
 */
export const getNextUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business_id");

  const { next_number, prefix, pad } = await ensureCounterRow(businessId);
  const paddedNum = String(next_number).padStart(pad || 1, "0");
  return `${prefix || ""}${paddedNum}`;
};

/**
 * Increments the invoice counter after a successful save.
 * Uses upsert to handle both existing and missing rows in one call.
 */
export const incrementUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) return;

  // Get current value first (ensureCounterRow guarantees it exists after getNextUsin ran)
  const { data, error } = await supabase
    .from("invoice_counters")
    .select("next_number")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) return;

  const currentNumber = data?.next_number || 1;

  await supabase
    .from("invoice_counters")
    .upsert(
      { business_id: businessId, next_number: currentNumber + 1, updated_at: new Date().toISOString() },
      { onConflict: "business_id" }
    );
};
