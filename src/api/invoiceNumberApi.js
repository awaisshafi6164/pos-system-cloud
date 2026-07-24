import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";

export const getNextUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business_id");

  const { data, error } = await supabase
    .from("invoice_counters")
    .select("next_number, prefix, pad")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    // No counter exists yet — return "1"
    return "1";
  }

  const { next_number, prefix, pad } = data;
  const paddedNum = String(next_number).padStart(pad || 1, "0");
  return `${prefix || ""}${paddedNum}`;
};

export const incrementUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) return;

  const { data, error } = await supabase
    .from("invoice_counters")
    .select("next_number")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) return;

  await supabase
    .from("invoice_counters")
    .update({ next_number: data.next_number + 1, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
};
