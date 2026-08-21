const {
  getRequester,
  getAdminClient,
  parseJsonBody,
  setCorsHeaders,
  checkRateLimit,
  json,
} = require("../_utils/supabaseAdmin");

// VPS proxy — static IP whitelisted with PRA
const VPS_PROXY_URL    = process.env.PRA_PROXY_URL;
const VPS_PROXY_SECRET = process.env.PRA_PROXY_SECRET;

const PRA_PRODUCTION_URL = "https://ims.pral.com.pk/ims/production/api/Live/PostData";
const PRA_SANDBOX_URL    = "https://ims.pral.com.pk/ims/sandbox/api/Live/PostData";

/** Read business_id from the X-Business-Id header (same logic as supabaseAdmin.js). */
const getBusinessIdHeader = (req) => {
  const raw =
    req.headers?.["x-business-id"] ||
    req.headers?.["X-Business-Id"] ||
    req.headers?.["x-business-id".toLowerCase()];
  return raw ? String(raw).trim() : null;
};

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const limit = checkRateLimit(req, 60, 60_000); // 60 invoices per minute per IP
  if (!limit.allowed) return json(res, 429, { error: `Too many requests. Retry after ${limit.retryAfter}s` });

  // ⚡ Read business_id from header upfront — it's available before any async work.
  const businessId = getBusinessIdHeader(req);
  if (!businessId) return json(res, 400, { error: "Missing X-Business-Id header." });

  try {
    // ⚡ Fire all three independent operations in parallel:
    //   1. Authenticate the user (auth.getUser → employees DB query inside getRequester)
    //   2. Fetch business settings using the header business_id — no auth result needed
    //   3. Parse the request body — pure I/O, no dependencies
    const supabaseAdmin = await getAdminClient();
    const [ctx, settingsResult, body] = await Promise.all([
      getRequester(req),
      supabaseAdmin
        .from("settings")
        .select("data")
        .eq("business_id", businessId)
        .maybeSingle(),
      parseJsonBody(req),
    ]);

    // Validate auth
    if (ctx.error) return json(res, 401, { error: ctx.error });

    // Confirm the authenticated employee belongs to the same business as the header claims
    if (ctx.requester.business_id !== businessId) {
      return json(res, 403, { error: "Business ID mismatch." });
    }

    const { invoiceData, environment } = body;
    if (!invoiceData) return json(res, 400, { error: "Missing invoiceData" });

    // Validate settings
    if (settingsResult.error) return json(res, 500, { error: "Failed to load business settings" });

    // ✅ PRA token is read server-side — never accepted from the browser payload
    const praToken = settingsResult.data?.data?.pra_token;
    const praApiType = environment || settingsResult.data?.data?.pra_api_type || "sandbox";

    if (!praToken) {
      return json(res, 400, { error: "PRA token not configured for this business. Set it in Settings." });
    }

    let praResult;

    if (VPS_PROXY_URL && VPS_PROXY_SECRET) {
      // ── Route through VPS (static IP) for production IP whitelisting ──
      const vpsResponse = await fetch(VPS_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Proxy-Secret": VPS_PROXY_SECRET,
        },
        body: JSON.stringify({ invoiceData, praToken, environment: praApiType }),
      });

      praResult = await vpsResponse.json();
    } else {
      // ── Direct call (sandbox / local dev without VPS configured) ──
      const praURL = praApiType === "production" ? PRA_PRODUCTION_URL : PRA_SANDBOX_URL;

      const praResponse = await fetch(praURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${praToken}`,
        },
        body: JSON.stringify(invoiceData),
      });

      praResult = await praResponse.json();
    }

    return json(res, 200, praResult);

  } catch (err) {
    console.error("[pra/post-invoice] Error:", err.message);
    return json(res, 500, { error: err.message || "Internal server error" });
  }
};
