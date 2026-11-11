// Single source of truth for GST math (totals effect + both invoice save paths).
//
// Rules: cash -> settings rate (gst_percentage); card -> card rate (gst_percentage_card,
// default 5). Inclusive/exclusive (`included`) applies to both.

// Default GST % for card payments when settings.gst_percentage_card is unset/blank.
export const DEFAULT_CARD_GST_PERCENTAGE = 5;

const round2 = (n) => +(+n).toFixed(2);

export const getGstRate = (paymentMode, cashRate, cardRate) => {
  if (paymentMode !== "card") return parseFloat(cashRate) || 0;
  const parsed = cardRate === "" || cardRate == null ? NaN : parseFloat(cardRate);
  return Number.isFinite(parsed) ? parsed : DEFAULT_CARD_GST_PERCENTAGE;
};

// amount = price*qty (gross of GST if included, net if excluded).
export const calcTax = (amount, rate, included) => {
  const raw = round2(parseFloat(amount) || 0);
  const r = parseFloat(rate) || 0;
  if (included) {
    const net = round2(raw / (1 + r / 100));
    return { net, tax: round2(raw - net), total: raw };
  }
  const tax = round2(raw * (r / 100));
  return { net: raw, tax, total: round2(raw + tax) };
};

// Split `totalCents` across `weights` proportionally, largest-remainder, so parts sum exactly.
const allocateCents = (totalCents, weights) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (totalCents * w) / sum);
  const parts = exact.map(Math.floor);
  let left = totalCents - parts.reduce((a, b) => a + b, 0);
  exact
    .map((e, i) => [e - parts[i], i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .forEach(([, i]) => { if (left-- > 0) parts[i] += 1; });
  return parts;
};

// Tax for a whole invoice at one rate. `amounts` are per-item price*qty values.
// Header tax is computed once on the item sum; it is then allocated to items in proportion
// to their amounts (largest-remainder, to the cent) so item taxes sum EXACTLY to the header.
// Returns { net, tax, total, items: [{ net, tax, total }] }.
export const calcInvoiceTax = (amounts, rate, included) => {
  const raws = amounts.map((a) => round2(parseFloat(a) || 0));
  const { net, tax, total } = calcTax(raws.reduce((a, b) => a + b, 0), rate, included);
  const taxes = allocateCents(Math.round(tax * 100), raws.map((r) => Math.max(r, 0))).map((c) => c / 100);
  const items = raws.map((raw, i) => ({
    net: included ? round2(raw - taxes[i]) : raw,
    tax: taxes[i],
    total: included ? raw : round2(raw + taxes[i]),
  }));
  return { net, tax, total, items };
};
