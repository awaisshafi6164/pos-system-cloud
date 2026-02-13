import { supabase } from "../supabaseClient";

const toIso = (dateTimeStr) => {
  if (!dateTimeStr) return null;
  // Accept "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm"
  const normalized = String(dateTimeStr).replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const startOfDayIso = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00:00`).toISOString();
const endOfDayIso = (yyyyMmDd) => new Date(`${yyyyMmDd}T23:59:59`).toISOString();

const mapLegacyInvoiceRow = (row, itemRows) => ({
  InvoiceNumber: row.pra_invoice_number || row.usin,
  USIN: row.usin,
  RefUSIN: row.ref_usin || null,
  DateTime: row.datetime ? new Date(row.datetime).toISOString().replace("T", " ").slice(0, 19) : null,
  BuyerName: row.buyer_name,
  BuyerPNTN: row.buyer_pntn,
  BuyerCNIC: row.buyer_cnic,
  BuyerPhoneNumber: row.buyer_phone,
  address: row.address || "",
  TotalSaleValue: Number(row.total_sale_value || 0),
  TotalTaxCharged: Number(row.total_tax_charged || 0),
  Discount: Number(row.discount || 0),
  FurtherTax: Number(row.further_tax || 0),
  TotalBillAmount: Number(row.total_bill_amount || 0),
  TotalQuantity: Number(row.total_quantity || 0),
  PaymentMode: row.payment_mode,
  InvoiceType: row.invoice_type,
  POS_Charges: Number(row.pos_charges || 0),
  Service_Charges: Number(row.service_charges || 0),
  Balance: Number(row.balance || 0),
  Paid: Number(row.paid || 0),
  // Hotel fields
  check_in_date: row.check_in_date || null,
  check_out_date: row.check_out_date || null,
  time_in: row.time_in || null,
  time_out: row.time_out || null,
  emergency_contact: row.emergency_contact || null,
  nationality: row.nationality || null,
  Items: (itemRows || []).map((it) => ({
    ItemCode: it.ItemCode ?? it.item_code,
    ItemName: it.ItemName ?? it.item_name,
    Quantity: it.Quantity ?? it.quantity,
    SaleValue: Number((it.SaleValue ?? it.sale_value) || 0),
    TaxRate: Number((it.TaxRate ?? it.tax_rate) || 0),
    TaxCharged: Number((it.TaxCharged ?? it.tax_charged) || 0),
    TotalAmount: Number((it.TotalAmount ?? it.total_amount) || 0),
  })),
});

export const lookupInvoiceLegacy = async ({ businessId, usin, buyerName }) => {
  if (!businessId) throw new Error("Missing businessId");
  const u = String(usin || "").trim();
  const n = String(buyerName || "").trim();
  if (!u && !n) throw new Error("Enter an invoice number or customer name.");

  let query = supabase
    .from("invoices")
    .select(
      "id, business_id, usin, pra_invoice_number, ref_usin, datetime, buyer_name, buyer_pntn, buyer_cnic, buyer_phone, address, total_sale_value, total_tax_charged, discount, further_tax, total_bill_amount, total_quantity, payment_mode, invoice_type, pos_charges, service_charges, balance, paid, check_in_date, check_out_date, time_in, time_out, emergency_contact, nationality"
    )
    .eq("business_id", businessId);

  if (u) query = query.eq("usin", u);
  else query = query.ilike("buyer_name", `%${n}%`);

  const { data: invoiceRow, error } = await query.order("datetime", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!invoiceRow) return { success: false, message: "Invoice not found" };

  const { data: itemRows, error: itemsError } = await supabase
    .from("invoice_items")
    .select("item_code, item_name, quantity, sale_value, tax_rate, tax_charged, total_amount")
    .eq("invoice_id", invoiceRow.id)
    .order("id", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return { success: true, invoice: mapLegacyInvoiceRow(invoiceRow, itemRows) };
};

export const saveInvoiceLegacy = async ({ businessId, payload, isCreditUpdate }) => {
  if (!businessId) throw new Error("Missing businessId");
  const usin = String(payload?.USIN || "").trim();
  if (!usin) throw new Error("Invoice number (USIN) is required.");

  const invoiceRow = {
    business_id: businessId,
    usin,
    pra_invoice_number: payload?.InvoiceNumber || null,
    ref_usin: payload?.RefUSIN || null,
    datetime: toIso(payload?.DateTime) || new Date().toISOString(),
    buyer_name: payload?.BuyerName || "Walk-in Customer",
    buyer_pntn: payload?.BuyerPNTN || "",
    buyer_cnic: payload?.BuyerCNIC || "",
    buyer_phone: payload?.BuyerPhoneNumber || "",
    address: payload?.address || "",
    total_sale_value: Number(payload?.TotalSaleValue || 0),
    total_tax_charged: Number(payload?.TotalTaxCharged || 0),
    discount: Number(payload?.Discount || 0),
    further_tax: Number(payload?.FurtherTax || 0),
    total_bill_amount: Number(payload?.TotalBillAmount || 0),
    total_quantity: Number(payload?.TotalQuantity || 0),
    payment_mode: payload?.PaymentMode ?? null,
    invoice_type: payload?.InvoiceType ?? null,
    pos_charges: Number(payload?.POS_Charges || 0),
    service_charges: Number(payload?.Service_Charges || 0),
    balance: Number(payload?.Balance || 0),
    paid: Number(payload?.Paid || 0),
    // Hotel fields (optional)
    check_in_date: payload?.checkInDate || null,
    check_out_date: payload?.checkOutDate || null,
    time_in: payload?.timeIn || null,
    time_out: payload?.timeOut || null,
    emergency_contact: payload?.emergencyContact || null,
    nationality: payload?.nationality || null,
    updated_at: new Date().toISOString(),
  };

  const items = Array.isArray(payload?.Items) ? payload.Items : [];
  const itemRows = items.map((it) => {
    const qty = Number(it.Quantity || 0);
    const saleValue = Number(it.SaleValue || 0);
    return {
      item_code: String(it.ItemCode || "").trim(),
      item_name: String(it.ItemName || "").trim(),
      quantity: qty,
      tax_rate: Number(it.TaxRate || 0),
      sale_value: saleValue,
      tax_charged: Number(it.TaxCharged || 0),
      total_amount: Number(it.TotalAmount || 0),
      unit_price: qty ? saleValue / qty : 0,
    };
  });

  if (itemRows.length === 0) throw new Error("Invoice must have at least 1 item.");

  if (isCreditUpdate) {
    const { data: existing, error: findError } = await supabase
      .from("invoices")
      .select("id")
      .eq("business_id", businessId)
      .eq("usin", usin)
      .single();

    if (findError) throw new Error(findError.message);

    const { error: updateError } = await supabase
      .from("invoices")
      .update(invoiceRow)
      .eq("id", existing.id)
      .eq("business_id", businessId);

    if (updateError) throw new Error(updateError.message);

    const { error: deleteItemsError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", existing.id);
    if (deleteItemsError) throw new Error(deleteItemsError.message);

    const { error: insertItemsError } = await supabase
      .from("invoice_items")
      .insert(itemRows.map((r) => ({ ...r, invoice_id: existing.id, business_id: businessId })));
    if (insertItemsError) throw new Error(insertItemsError.message);

    return { success: true };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("invoices")
    .insert([invoiceRow])
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  const { error: insertItemsError } = await supabase
    .from("invoice_items")
    .insert(itemRows.map((r) => ({ ...r, invoice_id: inserted.id, business_id: businessId })));
  if (insertItemsError) throw new Error(insertItemsError.message);

  return { success: true };
};

export const getTotalSalesLegacy = async ({ businessId, fromDate, toDate }) => {
  if (!businessId) throw new Error("Missing businessId");
  if (!fromDate || !toDate) throw new Error("Missing date range");

  const { data, error } = await supabase
    .from("invoices")
    .select("total_bill_amount, datetime")
    .eq("business_id", businessId)
    .gte("datetime", startOfDayIso(fromDate))
    .lte("datetime", endOfDayIso(toDate));

  if (error) throw new Error(error.message);
  const total = (data || []).reduce((sum, r) => sum + Number(r.total_bill_amount || 0), 0);
  return { success: true, total: total };
};

export const listInvoicesLegacy = async ({ businessId, fromDate, toDate }) => {
  if (!businessId) throw new Error("Missing businessId");

  let query = supabase
    .from("invoices")
    .select(
      "id, business_id, usin, pra_invoice_number, ref_usin, datetime, buyer_name, buyer_pntn, buyer_cnic, buyer_phone, address, total_sale_value, total_tax_charged, discount, further_tax, total_bill_amount, total_quantity, payment_mode, invoice_type, pos_charges, service_charges, balance, paid, check_in_date, check_out_date, time_in, time_out, emergency_contact, nationality, invoice_items(item_code, item_name, quantity, sale_value, tax_rate, tax_charged, total_amount)"
    )
    .eq("business_id", businessId)
    .order("datetime", { ascending: false });

  if (fromDate) query = query.gte("datetime", startOfDayIso(fromDate));
  if (toDate) query = query.lte("datetime", endOfDayIso(toDate));

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((row) => {
    const items = (row.invoice_items || []).map((it) => ({
      ItemCode: it.item_code,
      ItemName: it.item_name,
      Quantity: it.quantity,
      SaleValue: it.sale_value,
      TaxRate: it.tax_rate,
      TaxCharged: it.tax_charged,
      TotalAmount: it.total_amount,
    }));
    return mapLegacyInvoiceRow(row, items);
  });
};

export const deleteInvoiceById = async ({ businessId, invoiceId }) => {
  if (!businessId) throw new Error("Missing businessId");
  if (!invoiceId) throw new Error("Missing invoiceId");

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("business_id", businessId);

  if (error) throw new Error(error.message);
  return { success: true };
};
