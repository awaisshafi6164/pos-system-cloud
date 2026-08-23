import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";
import settingsManager from "../utils/SettingsManager";

/**
 * Returns the next invoice number for this business.
 *
 * Logic:
 *  1. Read invoice_prefix + invoice_pad from settings (same place all other config lives)
 *  2. Fetch the single last saved invoice (ORDER BY id DESC LIMIT 1)
 *  3. Strip the prefix, parse the trailing number, add 1
 *  4. Return prefix + (last_number + 1) zero-padded to pad digits
 *
 * Examples:
 *   Last USIN = "LR-1823"  → next = "LR-1824"
 *   Last USIN = "STG-0027" → next = "STG-0028"
 *   No invoices yet        → next = "LR-1" (prefix + 1)
 */
export const getNextUsin = async () => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business_id");

  // 1. Read prefix + pad from settings (uses in-memory cache — no extra DB call)
  const settings = await settingsManager.fetchSettings();
  const prefix = settings?.invoice_prefix || "";
  const pad    = parseInt(settings?.invoice_pad || "1", 10);

  // 2. Get the last saved invoice for this business (1 row, fast)
  const { data: lastInvoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("usin")
    .eq("business_id", businessId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invoiceError) throw new Error(invoiceError.message);

  // 3. Parse the number out of the last USIN
  let lastNumber = 0;
  if (lastInvoice?.usin) {
    const stripped = lastInvoice.usin.startsWith(prefix)
      ? lastInvoice.usin.slice(prefix.length)
      : lastInvoice.usin;

    const match = stripped.match(/^(\d+)/);
    if (match) {
      lastNumber = parseInt(match[1], 10);
    }
  }

  // 4. Build next USIN
  const next = lastNumber + 1;
  return `${prefix}${String(next).padStart(pad, "0")}`;
};
