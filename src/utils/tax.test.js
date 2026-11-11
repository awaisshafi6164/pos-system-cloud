import { calcInvoiceTax, calcTax, getGstRate } from "./tax";

describe("getGstRate", () => {
  test("cash uses settings rate", () => expect(getGstRate("cash", "16", "5")).toBe(16));
  test("card uses card rate", () => expect(getGstRate("card", "16", "8")).toBe(8));
  test("card rate defaults to 5 when unset/blank", () => {
    expect(getGstRate("card", "16", undefined)).toBe(5);
    expect(getGstRate("card", "16", "")).toBe(5);
  });
  test("explicit 0 card rate is honoured", () => expect(getGstRate("card", "16", "0")).toBe(0));
  test("cash with empty settings is 0", () => expect(getGstRate("cash", "", "5")).toBe(0));
});

describe("calcTax", () => {
  test("cash exclusive", () => expect(calcTax(1000, 16, false)).toEqual({ net: 1000, tax: 160, total: 1160 }));
  test("cash inclusive", () => expect(calcTax(1160, 16, true)).toEqual({ net: 1000, tax: 160, total: 1160 }));
  test("card exclusive", () => expect(calcTax(1000, 5, false)).toEqual({ net: 1000, tax: 50, total: 1050 }));
  test("card inclusive", () => expect(calcTax(1050, 5, true)).toEqual({ net: 1000, tax: 50, total: 1050 }));
  test("0% rate", () => {
    expect(calcTax(500, 0, false)).toEqual({ net: 500, tax: 0, total: 500 });
    expect(calcTax(500, 0, true)).toEqual({ net: 500, tax: 0, total: 500 });
  });
  test("rounding", () => {
    const r = calcTax(100, 5, true);
    expect([r.net, r.tax]).toEqual([95.24, 4.76]);
    expect(calcTax(99.99, 5, false).total).toBe(104.99);
  });
  test("discount interplay: payable = net + tax - discount", () => {
    const { net, tax } = calcTax(1000, 5, false);
    expect(net + tax - 100).toBe(950);
  });
});

describe("calcInvoiceTax", () => {
  test.each([false, true])("item taxes sum exactly to header (included=%s)", (inc) => {
    const r = calcInvoiceTax([33.33, 33.33, 33.34, 0.01, 10.07], 16, inc);
    expect(+r.items.reduce((a, i) => a + i.tax, 0).toFixed(2)).toBe(r.tax);
    expect(+r.items.reduce((a, i) => a + i.total, 0).toFixed(2)).toBe(r.total);
  });
  test("single item equals calcTax", () => {
    expect(calcInvoiceTax([1000], 5, false).items[0]).toEqual({ net: 1000, tax: 50, total: 1050 });
  });
  test("empty invoice", () => expect(calcInvoiceTax([], 16, false)).toEqual({ net: 0, tax: 0, total: 0, items: [] }));
});
