import { buildInvoiceCsv, escapeCsv, paymentLabel, cleanAddress, CSV_BOM } from "./invoiceCsv";

const inv = (o = {}) => ({
  InvoiceNumber: "0012", USIN: "INV-1", DateTime: "2026-01-02 10:00", BuyerName: "Ali",
  BuyerPhoneNumber: "03001234567", address: "Room: 5|Main St", TotalQuantity: 3,
  TotalSaleValue: "100", TotalTaxCharged: "16", FurtherTax: "0", Discount: "5",
  TotalBillAmount: "111", Balance: "11", PaymentMode: 2,
  Items: [{ ItemCode: "A1", Quantity: 2 }, { ItemCode: "B2", Quantity: 1 }], ...o,
});

test("escapeCsv quotes and doubles quotes", () => {
  expect(escapeCsv('a,"b"')).toBe('"a,""b"""');
  expect(escapeCsv("x\ny")).toBe('"x\ny"');
  expect(escapeCsv(null)).toBe("");
});
test("escapeCsv guards formula injection", () => {
  ["=1+1", "+1", "-1", "@SUM"].forEach((v) => expect(escapeCsv(v)).toBe(`'${v}`));
});
test("paymentLabel", () => {
  expect(paymentLabel(2)).toBe("Card");
  expect(paymentLabel(1)).toBe("Cash");
  expect(paymentLabel(undefined)).toBe("Cash");
});
test("cleanAddress drops hotel segments", () => expect(cleanAddress("Room: 5|Main St")).toBe("Main St"));
test("empty list: BOM, header, zero totals, CRLF", () => {
  const out = buildInvoiceCsv([]);
  expect(out.startsWith(CSV_BOM + "PRA No,")).toBe(true);
  expect(out.split("\r\n")[1]).toBe("TOTALS,,,,,,0,0.00,0.00,0.00,0.00,0.00,0.00,0.00,,");
});
test("row, paid=payable-balance, leading zeros, items, totals", () => {
  const out = buildInvoiceCsv([inv(), inv({ USIN: "INV-2", TotalBillAmount: "50", Balance: "0", PaymentMode: 1 })]);
  const lines = out.split("\r\n");
  expect(lines[1]).toBe('="0012",INV-1,2026-01-02 10:00,Ali,="03001234567",Main St,3,100.00,16.00,0.00,5.00,111.00,100.00,11.00,Card,A1 x 2; B2 x 1');
  expect(lines[3]).toBe("TOTALS,,,,,,6,200.00,32.00,0.00,10.00,161.00,150.00,11.00,,");
});
