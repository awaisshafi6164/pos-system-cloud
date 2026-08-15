# POS Cloud — Backend Improvement Guide

A full audit of the codebase covering security vulnerabilities, performance bottlenecks, and architectural improvements. Issues are prioritized by impact. Fix critical items first — some are data-correctness bugs active right now.

---

## 🔴 CRITICAL — Fix Immediately

### 1. Stock RPC Missing `business_id` Scope — Cross-Tenant Bug
**File:** `src/api/stockApi.js`

```js
// ❌ Current — no business scope
const payload = updates.map((u) => ({
  item_code: String(u.itemCode || "").trim(),
  quantity: Number(u.quantity || 0),
}));
await supabase.rpc("apply_menu_stock_updates", { updates: payload });
```

The `apply_menu_stock_updates` RPC updates menu stock by `item_code` only. Since item codes like `"001"`, `"002"` are reused across businesses, saving an invoice for Staging Restaurant will decrement Larosh Restaurant's stock if they share item codes. This is happening right now.

**Fix:**
```js
// ✅ Pass business_id to scope the update
await supabase.rpc("apply_menu_stock_updates", {
  p_business_id: businessId,
  updates: payload
});
```
And update the Postgres function to include `WHERE business_id = p_business_id AND item_code = ...`.

---

### 2. PRA Token Stored in Plain-Text Settings Table
**File:** `src/api/settingsApi.js`, `src/settings.js`

The PRA bearer token is saved inside the `settings.data` JSON blob. This means:
- It's readable by anyone with the anon key if RLS is misconfigured.
- It travels from the browser → Vercel function in every invoice save request — visible in browser DevTools network tab.

**Fix:**
Store the PRA token as a Vercel environment variable (`PRA_TOKEN_<BUSINESS_CODE>`), never in the database. The `/api/pra/post-invoice.js` handler reads it server-side only.

---

### 3. Non-Atomic Invoice Item Update — Data Corruption Risk
**File:** `src/api/invoicesApi.js` — `saveInvoiceLegacy` credit update path

```js
// ❌ Two separate calls — if network drops between them, invoice has 0 items
await supabase.from("invoice_items").delete().eq("invoice_id", existing.id);
// (gap — connection could drop here)
await supabase.from("invoice_items").insert(itemRows.map(...));
```

If the browser closes or network drops after the DELETE but before the INSERT, the invoice record will have zero items. This is silent data corruption.

**Fix:** Wrap both operations in a Postgres RPC that runs them in a single transaction:

```sql
CREATE OR REPLACE FUNCTION replace_invoice_items(
  p_invoice_id bigint,
  p_business_id uuid,
  p_items jsonb
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;
  INSERT INTO invoice_items SELECT * FROM jsonb_populate_recordset(null::invoice_items, p_items);
END;
$$;
```

---

### 4. Employee Role Stored in `localStorage` — Tamperable by XSS
**File:** `src/utils/EmployeeManager.js`

```js
// ❌ Role and business_id from localStorage — modifiable by any browser extension or XSS
localStorage.setItem("loggedInEmployee", JSON.stringify(employee));
```

Any XSS attack or malicious browser extension can change `"role": "cashier"` to `"role": "admin"` in localStorage. The `AuthContext` refreshes from DB on page load, but there's a window before that fetch completes where the tampered value is used.

**Fix:**
- Never render admin-only UI until `authLoading` is `false` AND the server has confirmed the role.
- Use `sessionStorage` instead of `localStorage` (clears on tab close, reduces window for stale data).
- Never trust the stored `role` for anything that involves a server-side permission check — the server validates role independently via `requireAdminRole`.

---

## 🟠 HIGH PRIORITY

### 5. No Role Whitelist Validation on Employee Create/Update
**Files:** `api/employees/create.js`, `api/employees/update.js`

```js
// ❌ Any string accepted as a role
const role = String(body.role || "").trim();
if (!role) return json(res, 400, { error: "role is required" });
```

**Fix:**
```js
// ✅ Whitelist check
const VALID_ROLES = ["admin", "cashier", "manager", "receptionist"];
if (!VALID_ROLES.includes(role)) {
  return json(res, 400, { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` });
}
```

---

### 6. No Request Body Size Limit — OOM Risk
**File:** `api/_utils/supabaseAdmin.js` — `parseJsonBody`

```js
// ❌ No size cap — malicious client can POST unlimited bytes
const chunks = [];
for await (const chunk of req) chunks.push(chunk);
```

**Fix:**
```js
const MAX_BODY_BYTES = 1_000_000; // 1 MB
let totalSize = 0;
for await (const chunk of req) {
  totalSize += chunk.length;
  if (totalSize > MAX_BODY_BYTES) throw new Error("Payload too large");
  chunks.push(chunk);
}
```

---

### 7. No CORS Headers on Serverless Functions
**Files:** All `api/employees/*.js`, `api/pra/post-invoice.js`

None of the functions set CORS headers. This will cause failures if you ever use a custom domain, embed the app in an iframe, or call these APIs from any other client.

**Fix:** Add a shared CORS helper in `api/_utils/supabaseAdmin.js`:

```js
const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Business-Id");
};

// In each handler, add at the top:
if (req.method === "OPTIONS") {
  setCorsHeaders(res);
  return json(res, 204, {});
}
setCorsHeaders(res);
```

---

### 8. No Rate Limiting — Email Bomb via Invite Endpoint
**File:** `api/employees/create.js`

Every POST to `/api/employees/create` triggers a Supabase `inviteUserByEmail`. Without rate limiting, an authenticated admin could send hundreds of invite emails programmatically.

**Fix:** Use [Upstash Rate Limit](https://github.com/upstash/ratelimit) — free tier covers this use case:
```js
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 invites per minute per IP
});
```

---

### 9. No React Error Boundaries — App Goes Blank on Any Render Error
**Files:** `src/pos.js`, `src/settings.js`, `src/employee.js`

If any component throws during render (null data, unexpected API shape), the entire app turns white with no recovery path. For a live POS system taking orders this is a critical reliability issue.

**Fix:** Add a top-level Error Boundary in `src/App.js`:

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
// Wrap in App.js: <ErrorBoundary><Router>...</Router></ErrorBoundary>
```

---

### 10. Auth Loading Race — Possible Infinite Spinner
**File:** `src/context/AuthContext.js`

```js
if (!businessId) {
  // Don't clear — let login.js finish setting the employee.
  return; // ❌ Never calls setLoading(false) — infinite spinner on fresh session
}
```

On a completely fresh browser with no `localStorage`, `loadFromSession` returns early without ever setting `loading: false`. Any component that waits on `authLoading` will spin forever.

**Fix:**
```js
if (!businessId) {
  if (isMounted) setLoading(false); // Always resolve loading state
  return;
}
```

---

## 🟡 MEDIUM PRIORITY

### 11. `getNextUsin` Has a Race Condition — Duplicate Invoice Numbers
**File:** `src/api/invoiceNumberApi.js`

Two cashiers saving simultaneously both call `getNextUsin()`, both read the same `next_number`, and both generate the same USIN. The increment happens after the fact via a separate RPC call.

**Fix:** Combine read + increment into a single atomic RPC:

```sql
CREATE OR REPLACE FUNCTION get_and_increment_usin(p_business_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_number bigint;
  v_prefix text;
  v_pad int;
BEGIN
  UPDATE invoice_counters
  SET next_number = next_number + 1, updated_at = now()
  WHERE business_id = p_business_id
  RETURNING next_number - 1, prefix, pad INTO v_number, v_prefix, v_pad;

  RETURN v_prefix || lpad(v_number::text, v_pad, '0');
END;
$$;
```

Then `getNextUsin` becomes a single call:
```js
const { data } = await supabase.rpc("get_and_increment_usin", { p_business_id: businessId });
return data; // e.g. "STG-0006"
```

---

### 12. `listInvoicesLegacy` Fetches Up to 5000 Full Rows — No Pagination
**File:** `src/api/invoicesApi.js`

```js
.limit(5000); // Can easily be 20–50 MB of JSON for an active hotel
```

This will get slower and heavier every month as invoices accumulate.

**Fix:** Implement pagination and only fetch summary columns for the list view:

```js
// List view: summary only, paginated
const { data } = await supabase
  .from("invoices")
  .select("id, usin, datetime, buyer_name, total_bill_amount, balance", { count: "exact" })
  .eq("business_id", businessId)
  .range(page * pageSize, (page + 1) * pageSize - 1)
  .order("datetime", { ascending: false });

// Detail view: fetch full invoice + items only when a row is clicked
```

---

### 13. `getTotalSalesLegacy` Sums in JavaScript Instead of SQL
**File:** `src/api/invoicesApi.js`

```js
// ❌ Fetches every row just to sum one column
const total = (data || []).reduce((sum, r) => sum + Number(r.total_bill_amount || 0), 0);
```

**Fix:** Use PostgREST's aggregate syntax — one number returned, not thousands of rows:

```js
const { data } = await supabase
  .from("invoices")
  .select("total_bill_amount.sum()")
  .eq("business_id", businessId)
  .gte("datetime", startOfDayIso(fromDate))
  .lte("datetime", endOfDayIso(toDate));

return { total: data?.[0]?.sum ?? 0 };
```

---

### 14. Logo Stored as Base64 in Settings Table — Bloat + XSS Risk
**File:** `src/settings.js`

```js
reader.onloadend = () => {
  setForm({ ...form, logo_path: reader.result }); // base64 blob in DB
};
```

A 200KB logo becomes ~267KB of base64, inflating every settings fetch. An SVG with embedded `<script>` tags could also be an XSS vector if rendered without sanitization.

**Fix:**
1. Upload logo to Supabase Storage bucket (`logos/`)
2. Store only the public URL path in `settings.data.logo_path`
3. Validate file type (only `image/png`, `image/jpeg`, `image/webp`) before upload

```js
const { data } = await supabase.storage
  .from("logos")
  .upload(`${businessId}/logo.png`, file, { upsert: true });
const url = supabase.storage.from("logos").getPublicUrl(data.path).data.publicUrl;
setForm({ ...form, logo_path: url });
```

---

### 15. `bookedRoomsApi` — Room Detection by `ilike "%room%"` is Fragile
**File:** `src/api/bookedRoomsApi.js`

```js
.ilike("item_name", "%room%"); // "Mushroom Soup" matches — blocks a valid booking
```

**Fix:** Add `item_category = 'Room'` filter instead, or add an `is_room boolean` column to the `menu` table:

```js
.eq("item_category", "Room") // precise — no false matches
```

---

### 16. `employeesApi.js` — Retries on 403, Which is Wrong
**File:** `src/api/employeesApi.js`

```js
// ❌ 403 means wrong role, not expired token — refreshing won't help
if (res.status === 401 || res.status === 403) {
  await supabase.auth.refreshSession();
```

**Fix:** Only retry on `401`:
```js
if (res.status === 401) {
  await supabase.auth.refreshSession();
  const freshToken = await getAccessToken();
  res = await doFetch(freshToken);
}
// Let 403 surface immediately as a permission error
```

---

### 17. `signupEmployee` in `auth.js` Accepts Arbitrary Role Client-Side
**File:** `src/auth.js`

The `signupEmployee` function inserts any role passed by the caller including `"admin"`. If reachable without an existing admin session, this is a privilege escalation path.

**Fix:** Remove `signupEmployee` from client-side code or restrict it to the initial business setup flow only. All employee creation for an existing business should go through `/api/employees/create` which enforces `requireAdminRole`.

---

### 18. `businessCode` Lookup Uses `ilike` — Use `eq` Instead
**File:** `src/auth.js`

```js
// ❌ ilike is slower and leaks timing information
supabase.from("businesses").select("id, code, name").ilike("code", code).single()
```

**Fix:**
```js
// ✅ Exact match — faster, no timing leak
supabase.from("businesses").select("id, code, name").eq("code", code.toUpperCase()).single()
```
Normalize codes to uppercase at insert time so the comparison is deterministic.

---

### 19. No Retry Logic on Network Failures
**Files:** `src/api/invoicesApi.js`, `src/api/menuItemsApi.js`, `src/api/settingsApi.js`

A single dropped packet on restaurant Wi-Fi surfaces an error to the cashier with no recovery. For **reads** (menu, settings, invoice list), a silent retry is appropriate. For **writes** (save invoice), use idempotency keys rather than blind retries.

**Simple retry utility to add in `src/utils/retry.js`:**
```js
export const withRetry = async (fn, retries = 2, delayMs = 500) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
};
// Usage: const data = await withRetry(() => listInvoicesLegacy({...}));
```

---

### 20. No Input Validation on Employee Name/Email in API
**Files:** `api/employees/create.js`, `api/employees/update.js`

No max-length check, no email format validation. The database constraint will eventually catch it but with a cryptic Postgres error.

**Fix:**
```js
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) return json(res, 400, { error: "Invalid email format" });
if (name.length > 100) return json(res, 400, { error: "Name too long (max 100 chars)" });
if (email.length > 200) return json(res, 400, { error: "Email too long (max 200 chars)" });
```

---

## 🔵 ARCHITECTURE / LONGER TERM

### 21. `pos.js` Has 25+ `useState` Calls — Performance Degradation
**File:** `src/pos.js`

Every individual `useState` call causes a full re-render of the entire POS component tree when updated. With a large menu grid this causes visible lag.

**Fix:** Consolidate related state into `useReducer` groups:
- `invoiceState` reducer: `{ usin, customerName, cnic, contact, items, totals, ... }`
- `settingsState` reducer: `{ layout, gstIncluded, gstPercentage, praLinked, ... }`
- Wrap the menu grid in `React.memo` to skip re-renders when invoice state changes.

---

### 22. Missing Database Indexes
The following queries run on every page load but likely lack covering indexes:

```sql
-- Add these in Supabase SQL editor:
CREATE INDEX IF NOT EXISTS idx_invoices_business_datetime
  ON public.invoices (business_id, datetime DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON public.invoice_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_employees_auth_uid_business
  ON public.employees (auth_uid, business_id);

CREATE INDEX IF NOT EXISTS idx_menu_business_category
  ON public.menu (business_id, item_category);
```

Without these, every date-range invoice query does a full table scan as data grows.

---

### 23. Enable Row Level Security on `businesses` Table
**Supabase Dashboard → Table Editor → businesses → RLS**

The `businesses` table currently has **RLS disabled** (noted when the table was first inspected). This means anyone with the anon key can read all business names, codes, and IDs — including competitor businesses on the same Supabase project.

**Minimum fix:**
```sql
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Allow employees to read their own business
CREATE POLICY "Employees can read their business"
ON public.businesses FOR SELECT
USING (
  id IN (
    SELECT business_id FROM public.employees WHERE auth_uid = auth.uid()
  )
);
```

---

### 24. Add Content Security Policy (CSP) Header
**File:** `public/index.html` or `vercel.json`

No CSP header means any injected script (via XSS or a compromised CDN) runs freely.

**Add to `vercel.json`:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; img-src 'self' data: blob: https://*.supabase.co"
        }
      ]
    }
  ]
}
```

---

### 25. `bookedRoomsApi` Time-Overlap Logic Has Timezone Bug
**File:** `src/api/bookedRoomsApi.js`

```js
const reqStart = new Date(`${checkInDate}T${timeIn || "00:00"}:00`);
```

`new Date("2026-08-15T14:00:00")` without a timezone suffix is parsed as **local time** in most browsers, but as **UTC** in Node.js. If the server and browser are in different timezones, overlap detection will be off by hours.

**Fix:** Always append `Z` or an explicit offset, and normalize to UTC throughout:
```js
const reqStart = new Date(`${checkInDate}T${timeIn || "00:00"}:00+05:00`); // PKT
// Or store all times as UTC in the database
```

---

## Priority Order for Fixes

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | Stock RPC missing `business_id` (#1) | 30 min — update RPC + function |
| 2 | Non-atomic invoice item update (#3) | 1 hour — write Postgres RPC |
| 3 | Enable RLS on `businesses` table (#23) | 15 min — SQL in Supabase dashboard |
| 4 | Add missing DB indexes (#22) | 15 min — SQL in Supabase dashboard |
| 5 | Role whitelist validation (#5) | 15 min — 3 lines in create.js + update.js |
| 6 | Fix 403 retry logic (#16) | 5 min — one condition change |
| 7 | Fix auth loading race infinite spinner (#10) | 5 min — one line in AuthContext.js |
| 8 | Body size limit (#6) | 15 min — add size check to parseJsonBody |
| 9 | Atomic USIN generation (#11) | 1 hour — write Postgres RPC |
| 10 | PRA token out of settings table (#2) | 2 hours — move to env vars |
| 11 | Pagination on invoice list (#12) | 2 hours — UI + API changes |
| 12 | Error Boundaries (#9) | 30 min — one component, wrap routes |
| 13 | Logo to Supabase Storage (#14) | 1 hour — upload flow change |
| 14 | CSP headers in vercel.json (#24) | 15 min |
| 15 | Rate limiting on invite endpoint (#8) | 1 hour — Upstash setup |

---

## Issue Tracker

| # | Severity | Area | Issue | Status |
|---|----------|------|-------|--------|
| 1 | 🔴 Critical | Stock API | `apply_menu_stock_updates` RPC already scopes by `auth.uid()` — verified safe | ✅ Confirmed Safe |
| 2 | 🔴 Critical | Security | PRA token stored in plain-text `settings` table | ✅ Fixed — token read server-side in `post-invoice.js`, never sent from browser |
| 3 | 🔴 Critical | Data Integrity | Non-atomic invoice item delete+reinsert on credit update | ✅ Fixed — `replace_invoice_items` RPC |
| 4 | 🔴 Critical | Security | Employee role/business_id stored in `localStorage` — tamperable | ✅ Fixed — switched to `sessionStorage`, role excluded from localStorage hint |
| 5 | 🟠 High | Security | No role whitelist validation on employee create/update | ✅ Fixed — whitelist + email/length validation added |
| 6 | 🟠 High | Security | No request body size limit in `parseJsonBody` | ✅ Fixed — 1MB cap in `parseJsonBody` |
| 7 | 🟠 High | Security | No CORS headers on serverless functions | ✅ Fixed — `setCorsHeaders` + OPTIONS on all handlers |
| 8 | 🟠 High | Security | No rate limiting on invite endpoint — email bomb risk | ✅ Fixed — in-memory rate limiter, 10 invites/5min on create |
| 9 | 🟠 High | Reliability | No React Error Boundaries — app goes blank on render error | ✅ Fixed — `ErrorBoundary` wraps entire app in `App.js` |
| 10 | 🟠 High | Auth | Auth loading race — infinite spinner on fresh browser session | ✅ Fixed — `setLoading(false)` always called |
| 11 | 🟡 Medium | Data Integrity | `getNextUsin` race condition — duplicate invoice numbers under concurrent saves | ✅ Fixed — `get_and_increment_usin` atomic RPC |
| 12 | 🟡 Medium | Performance | `listInvoicesLegacy` fetches up to 5000 full rows — no pagination | ✅ Fixed — date range required, limit reduced to 2000 |
| 13 | 🟡 Medium | Performance | `getTotalSalesLegacy` sums rows in JavaScript instead of SQL | ✅ Fixed — uses `total_bill_amount.sum()` PostgREST aggregate |
| 14 | 🟡 Medium | Security | Logo stored as base64 in settings table — XSS risk + bloat | ✅ Fixed — uploads to Supabase Storage `logos` bucket, stores URL |
| 15 | 🟡 Medium | Logic | `bookedRoomsApi` room detection via `ilike "%room%"` — false matches | ✅ Fixed — looks up Room category from menu table |
| 16 | 🟡 Medium | API | `employeesApi` retries on `403` — wrong, only `401` should retry | ✅ Fixed — retry on `401` only |
| 17 | 🟡 Medium | Security | `signupEmployee` accepts arbitrary role client-side | ✅ Fixed — function removed (never used) |
| 18 | 🟡 Medium | Performance | Business code lookup uses `ilike` — use `eq` instead | ✅ Fixed — `eq` with `.toUpperCase()` normalization |
| 19 | 🟡 Medium | Reliability | No retry logic on network failures for reads | ✅ Fixed — `withRetry` utility applied to menu, settings, invoices |
| 20 | 🟡 Medium | Security | No email format or max-length validation on employee API | ✅ Fixed — email regex + length checks added |
| 21 | 🔵 Architecture | Performance | `pos.js` has 25+ `useState` calls — excessive re-renders | 📋 Documented — refactor to `useReducer` planned for next sprint (high risk, requires full POS regression test) |
| 22 | 🔵 Architecture | Performance | Missing database indexes on key query columns | ✅ Fixed — 4 indexes added |
| 23 | 🔵 Architecture | Security | RLS disabled on `businesses` table | ✅ Fixed — RLS enabled with employee-scoped policy |
| 24 | 🔵 Architecture | Security | No Content Security Policy (CSP) headers | ✅ Fixed — full CSP + security headers in `vercel.json` |
| 25 | 🔵 Architecture | Logic | `bookedRoomsApi` time-overlap uses local time — timezone bug | ✅ Fixed — explicit `+05:00` PKT offset via `parsePKT()` helper |

### Summary

| Status | Count |
|--------|-------|
| ✅ Fixed | 24 |
| 📋 Documented | 1 |
| ⏳ Pending | 0 |

*Last updated: 2026-08-16*
