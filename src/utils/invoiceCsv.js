// Pure helpers for exporting the visible invoice list as an Excel-ready CSV.

export const CSV_BOM = "\uFEFF";
const EOL = "\r\n";

const HEADERS = [
  "PRA No", "Invoice No", "Date & Time", "Customer Name", "Contact", "Address",
  "Quantity", "Total Cost", "Tax", "Further Tax", "Discount", "Payable", "Paid",
  "Balance", "Payment Method", "Items",
];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n) => n.toFixed(2);

// PaymentMode: 2 = Card, anything else = Cash (Mixed does not exist on this branch).
export const paymentLabel = (mode) => (Number(mode) === 2 ? "Card" : "Cash");

// Same cleaning the table applies: drop hotel-only "Room:/In:/..." segments.
export const cleanAddress = (address) => {
  if (!address) return "";
  const skip = ["Room:", "In:", "Out:", "TimeIn:", "TimeOut:", "Emergency:", "Nationality:"];
  const part = String(address).split("|").find((p) => !skip.some((s) => p.trim().startsWith(s)));
  return part ? part.trim() : "";
};

// Quote when needed; neutralise formula injection (= + - @ and tab/CR leaders).
export const escapeCsv = (value) => {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Identifier-like text (phone, PRA no, invoice no): keep leading zeros in Excel via ="0300...".
const textId = (value) => {
  const s = value === null || value === undefined ? "" : String(value).trim();
  return /^0\d+$/.test(s) ? `="${s}"` : escapeCsv(s);
};

const itemsSummary = (items) =>
  (Array.isArray(items) ? items : [])
    .map((i) => `${i.ItemCode ?? i.ItemName ?? ""} x ${i.Quantity ?? ""}`)
    .join("; ");

export function buildInvoiceCsv(invoices) {
  const totals = { qty: 0, cost: 0, tax: 0, ftax: 0, disc: 0, pay: 0, paid: 0, bal: 0 };
  const lines = [HEADERS.join(",")];

  for (const inv of invoices) {
    const qty = num(inv.TotalQuantity), cost = num(inv.TotalSaleValue), tax = num(inv.TotalTaxCharged);
    const ftax = num(inv.FurtherTax), disc = num(inv.Discount), pay = num(inv.TotalBillAmount);
    const bal = num(inv.Balance), paid = pay - bal;
    totals.qty += qty; totals.cost += cost; totals.tax += tax; totals.ftax += ftax;
    totals.disc += disc; totals.pay += pay; totals.paid += paid; totals.bal += bal;

    lines.push([
      textId(inv.InvoiceNumber), textId(inv.USIN), escapeCsv(inv.DateTime),
      escapeCsv(inv.BuyerName), textId(inv.BuyerPhoneNumber), escapeCsv(cleanAddress(inv.address)),
      qty, money(cost), money(tax), money(ftax), money(disc), money(pay), money(paid), money(bal),
      paymentLabel(inv.PaymentMode ?? inv.payment_mode), escapeCsv(itemsSummary(inv.Items)),
    ].join(","));
  }

  lines.push([
    "TOTALS", "", "", "", "", "", totals.qty, money(totals.cost), money(totals.tax),
    money(totals.ftax), money(totals.disc), money(totals.pay), money(totals.paid), money(totals.bal), "", "",
  ].join(","));

  return CSV_BOM + lines.join(EOL) + EOL;
}
