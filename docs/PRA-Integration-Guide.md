# PRA Integration Guide - Cloud POS System

## Overview

This document outlines the complete step-by-step plan for integrating POS-Cloud (hosted on **Vercel** + **Supabase**) with the **Punjab Revenue Authority (PRA)** fiscalization system for production use.

---

## Current Architecture

```
┌─────────────────┐       ┌───────────────────┐       ┌──────────────────┐
│   React App     │       │     Supabase      │       │    PRA API       │
│   (Vercel)      │──────▶│   (Database)      │       │  (ims.pral.com)  │
│                 │       │                   │       │                  │
│ Frontend + API  │       │ Settings, Invoices│       │ Fiscalization    │
│ Serverless Fns  │       │ Menu, Stock, etc. │       │ Service          │
└─────────────────┘       └───────────────────┘       └──────────────────┘
```

### Current PRA Settings (stored in Supabase `settings` table → `data` JSON)

| Setting Key     | Values                    | Description                          |
|-----------------|---------------------------|--------------------------------------|
| `pra_linked`    | `"0"` / `"1"`             | Toggle PRA integration on/off        |
| `pra_posid`     | e.g., `"814529"`          | POS ID from PRA registration         |
| `pra_token`     | Bearer token string       | Auth token for PRA API               |
| `pra_api_type`  | `"sandbox"` / `"production"` | Which PRA environment to hit      |

### Current PRA Call in `pos.js` → `handleSave()`

Currently, the PRA API is called **directly from the browser** via `fetch()`:
```javascript
const praResponse = await fetch(praURL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${pra_token}`
  },
  body: JSON.stringify(payload)
});
```

---

## Problems with Current Approach (for Production)

| Problem | Impact |
|---------|--------|
| **CORS** | PRA API likely blocks browser cross-origin requests |
| **Token Exposure** | PRA token is visible in browser DevTools |
| **IP Whitelisting** | PRA requires a static IP for production, Vercel has dynamic IPs |
| **No Static IP** | Vercel/Netlify serverless functions don't offer static outbound IPs on free tier |

---

## Solution Architecture (Recommended)

```
┌─────────────┐     ┌────────────────────┐     ┌───────────────────────┐
│ React App   │     │  Oracle Cloud VPS   │     │      PRA API          │
│ (Vercel)    │────▶│  (Static IP Proxy)  │────▶│ ims.pral.com.pk       │
│             │     │  Node.js Express    │     │ /ims/production/...   │
└─────────────┘     └────────────────────┘     └───────────────────────┘
     │                     ▲
     │                     │ Static IP whitelisted with PRA
     ▼                     │
┌─────────────┐            │
│  Supabase   │            │
│ (Database)  │     This IP is the SAME for ALL businesses
└─────────────┘
```

---

## Step-by-Step Implementation Plan

### Phase 1: PRA Registration (Per Business/Client)

**What to do:**
1. Login to https://reg.pra.punjab.gov.pk/ with the client's credentials
2. Navigate to: Registration → POS Client Registration
3. Fill in all tabs:
   - **Business Information**: PNTN, Brand, POS type (Cloud Based), etc.
   - **Contact Information**: Contact person, mobile, email, address
   - **Branch Information**: Branch name, city, sector, address
   - **POS Details**: Branch, Counter Name, POS Type, MAC Address, IP Address
4. Save and get the **POS Registration Number (POS ID)**
5. Go to **Generate Test POS** tab → Generate Test POS IDs (for sandbox testing)
6. Note down:
   - **POS ID** (for production)
   - **Access Code** 
   - **Production Token** (found under POS Details tab against the POS ID)

**Store in your app's Settings page:**
- `pra_posid` = POS ID from registration
- `pra_token` = Production Token from POS Details tab
- `pra_api_type` = "production" 
- `pra_linked` = "1"

---

### Phase 2: Set Up Static IP Proxy (One-time, Shared by All Clients)

**Why:** PRA requires IP whitelisting for production. Vercel doesn't provide static IPs.

**Option: Oracle Cloud Always Free VPS**
- Sign up at https://cloud.oracle.com (always-free tier)
- Create an ARM VM instance (1 GB RAM, free forever)
- You get a **static public IP**
- Install Node.js and set up a tiny Express proxy

**Proxy Server Code (`server.js`):**

```javascript
const express = require('express');
const app = express();
app.use(express.json());

const PRA_PRODUCTION_URL = 'https://ims.pral.com.pk/ims/production/api/Live/PostData';
const PRA_SANDBOX_URL = 'https://ims.pral.com.pk/ims/sandbox/api/Live/PostData';

// Optional: Add a shared secret to prevent unauthorized use of your proxy
const PROXY_SECRET = process.env.PROXY_SECRET || 'your-secret-key';

app.post('/api/pra/post-invoice', async (req, res) => {
  try {
    // Validate proxy secret
    const proxyAuth = req.headers['x-proxy-secret'];
    if (proxyAuth !== PROXY_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { invoiceData, praToken, environment } = req.body;

    if (!invoiceData || !praToken) {
      return res.status(400).json({ error: 'Missing invoiceData or praToken' });
    }

    const praURL = environment === 'production' ? PRA_PRODUCTION_URL : PRA_SANDBOX_URL;

    const response = await fetch(praURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${praToken}`
      },
      body: JSON.stringify(invoiceData)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('PRA Proxy Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PRA Proxy running on port ${PORT}`);
});
```

**Deploy & run:**
```bash
# On Oracle VPS
npm init -y
npm install express
node server.js
# Or use PM2: pm2 start server.js --name pra-proxy
```

**Security:**
- Use `PROXY_SECRET` env variable to protect your proxy from abuse
- Enable HTTPS using Let's Encrypt (certbot) or put behind Nginx
- Optionally whitelist only your Vercel app's domain via CORS

---

### Phase 3: IP Whitelisting with PRA (Per Business/Client)

**For each new client you onboard, send this email:**

```
To: eims@pra.punjab.gov.pk
Subject: IP WhiteList Request | PNTN XXXXXXX-X - POS ID XXXXXX

Dear PRA Team,

Kindly whitelist the following IP for eIMS integration:

PNTN: [client's PNTN number]
BUSINESS NAME: [client's business name]
POS ID: [client's POS ID from registration]
SERVER IP: [your Oracle VPS static IP - SAME for all clients]
SERVER LOCATION: [e.g., USA / Mumbai / etc.]
```

**Important:** The same static IP works for ALL your clients. You just send a separate email for each client's PNTN/POS ID.

---

### Phase 4: Update Frontend Code (`pos.js`)

**Change the direct PRA fetch call to go through your proxy instead:**

**Before (current code in `handleSave`):**
```javascript
if (pra_linked === "1") {
  const praURL = pra_api_type === "production"
    ? "https://ims.pral.com.pk/ims/production/api/Live/PostData"
    : "https://ims.pral.com.pk/ims/sandbox/api/Live/PostData";

  const praResponse = await fetch(praURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pra_token}`
    },
    body: JSON.stringify(payload)
  });
  const praResult = await praResponse.json();
}
```

**After (through proxy):**
```javascript
if (pra_linked === "1") {
  const PROXY_URL = "https://your-oracle-vps-domain.com/api/pra/post-invoice";
  const PROXY_SECRET = "your-shared-secret"; // Store in env or settings

  console.log("📤 Sending to PRA via proxy...");
  const praResponse = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Proxy-Secret": PROXY_SECRET
    },
    body: JSON.stringify({
      invoiceData: payload,
      praToken: pra_token,
      environment: pra_api_type  // "sandbox" or "production"
    })
  });

  const praResult = await praResponse.json();
  console.log("✅ PRA API Response:", praResult);

  if (praResult.Code !== "100") {
    document.getElementById("api-message").textContent = "❌ PRA Error: " + praResult.Response;
    setIsSaving(false);
    return;
  }

  payload.InvoiceNumber = praResult.InvoiceNumber;
  setLastPRAInvoice(praResult.InvoiceNumber);
}
```

---

### Phase 5: (Alternative) Use Vercel Serverless Function as Intermediate

Instead of calling the proxy directly from the browser, you can add a Vercel serverless function to keep the proxy secret server-side:

**Create file: `api/pra/post-invoice.js`**

```javascript
const { json, parseJsonBody, getRequester } = require("../_utils/supabaseAdmin");

const PROXY_URL = process.env.PRA_PROXY_URL;       // Your Oracle VPS URL
const PROXY_SECRET = process.env.PRA_PROXY_SECRET; // Shared secret

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    // Authenticate the user
    const ctx = await getRequester(req);
    if (ctx.error) return json(res, 401, { error: ctx.error });

    const body = await parseJsonBody(req);
    const { invoiceData, praToken, environment } = body;

    if (!invoiceData || !praToken) {
      return json(res, 400, { error: "Missing invoiceData or praToken" });
    }

    // Forward to your static IP proxy
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Secret": PROXY_SECRET
      },
      body: JSON.stringify({ invoiceData, praToken, environment })
    });

    const data = await response.json();
    return json(res, response.status, data);
  } catch (err) {
    return json(res, 500, { error: err.message });
  }
};
```

**Benefit:** The proxy secret stays server-side (Vercel env vars) and never reaches the browser.

---

### Phase 6: Add Proxy URL to Settings (Optional Enhancement)

Add a new field in Settings page for the proxy URL so each deployment can be configured:

| Setting Key       | Example Value                                     |
|-------------------|---------------------------------------------------|
| `pra_proxy_url`   | `https://your-vps.com/api/pra/post-invoice`       |

Or use Vercel environment variables:
- `PRA_PROXY_URL` = `https://your-vps-ip:3001/api/pra/post-invoice`
- `PRA_PROXY_SECRET` = `your-secret-key`

---

## Summary: What Each Business Client Needs

| Requirement | Who Does It | One-Time or Per Client? |
|-------------|-------------|------------------------|
| Oracle VPS setup | You (developer) | One-time |
| Proxy server deployment | You (developer) | One-time |
| PRA POS Registration | Client (with your help) | Per client |
| IP Whitelisting email | You (on behalf of client) | Per client |
| Settings config (POS ID, Token) | Client via Settings page | Per client |
| Code update (proxy call) | You (developer) | One-time |

---

## Testing Checklist

### Sandbox Testing (No IP Whitelisting needed)
- [ ] Set `pra_api_type` = "sandbox" in settings
- [ ] Use sandbox token: `24d8fab3-f2e9-398f-ae17-b387125ec4a2`
- [ ] Use any test POS ID generated from PRA portal
- [ ] Verify invoice submission returns Code "100"
- [ ] Verify InvoiceNumber is returned and stored
- [ ] Verify QR code on receipt links to correct PRA verification page

### Production Testing (After IP Whitelisting)
- [ ] Set `pra_api_type` = "production" in settings
- [ ] Use production POS ID from PRA registration
- [ ] Use production token from POS Details tab
- [ ] Confirm IP whitelisting email was acknowledged by PRA
- [ ] Verify invoice submission returns Code "100"
- [ ] Verify on PRA portal: Login → IMS Fiscal Report → Search by date/POS ID
- [ ] Verify QR code on receipt is scannable and shows invoice on PRA portal

---

## PRA Invoice Payload Reference

```json
{
  "InvoiceNumber": "",
  "POSID": 814529,
  "USIN": "001897",
  "RefUSIN": null,
  "DateTime": "2024-01-15 14:30:00",
  "BuyerName": "Customer Name",
  "BuyerPNTN": "1234567-8",
  "BuyerCNIC": "12345-1234567-8",
  "BuyerPhoneNumber": "03001234567",
  "TotalSaleValue": 1298.00,
  "TotalTaxCharged": 221.00,
  "Discount": 0.00,
  "FurtherTax": 0.00,
  "TotalBillAmount": 1519.00,
  "TotalQuantity": 3,
  "PaymentMode": 1,
  "InvoiceType": 1,
  "Items": [
    {
      "ItemCode": "001",
      "ItemName": "Chicken Karahi",
      "PCTCode": "01011000",
      "Quantity": 1,
      "TaxRate": 17,
      "SaleValue": 1298.00,
      "Discount": 0.00,
      "FurtherTax": 0.00,
      "TaxCharged": 221.00,
      "TotalAmount": 1519.00,
      "InvoiceType": 1,
      "RefUSIN": null
    }
  ]
}
```

### Response (Success)
```json
{
  "InvoiceNumber": "90000520191112000369",
  "Code": "100",
  "Response": "Fiscal Invoice Number generated successfully.",
  "Errors": null
}
```

### PaymentMode Values
| Code | Meaning |
|------|---------|
| 1 | Cash |
| 2 | Card |
| 3 | Gift Voucher |
| 4 | Loyalty Card |
| 5 | Mixed |
| 6 | Cheque |

### InvoiceType Values
| Code | Meaning |
|------|---------|
| 1 | New |
| 2 | Debit |
| 3 | Credit (Return/Cancel) |

---

## QR Code & Invoice Verification

Customers can verify invoices at:
```
https://reg.pra.punjab.gov.pk/IMSFiscalReport/SearchPOSInvoice_Report.aspx?PRAInvNo=XXXXXXXXXX
```

Current Receipt.js already generates this QR code correctly:
```javascript
const qrData = `https://reg.pra.punjab.gov.pk/IMSFiscalReport/SearchPOSInvoice_Report.aspx?PRAInvNo=${praInvoiceNumber}`;
```

---

## IMS Fiscal Report (Verify Posted Data)

- For invoices **before August 2024**: Login to https://reg.pra.punjab.gov.pk/
- For invoices **September 2024 onwards**: Login to https://e.pra.punjab.gov.pk/
- Click on 'IMS Fiscal Report' button to view/search posted invoices

---

## Technical Support (PRA)

- **Email:** eims@pra.punjab.gov.pk
- **Phone:** 042-99205710
- Include: PNTN, POS ID, error screenshot, contact number

---

## Files to Modify (Implementation)

| File | Change |
|------|--------|
| `src/pos.js` (line ~750) | Replace direct PRA fetch with proxy call |
| `api/pra/post-invoice.js` | NEW - Vercel serverless function (optional) |
| `Oracle VPS/server.js` | NEW - Static IP proxy server |
| `src/settings.js` | Optional: Add proxy URL field |
| `.env` / Vercel Env Vars | Add `PRA_PROXY_URL`, `PRA_PROXY_SECRET` |
