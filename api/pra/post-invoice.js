const { getRequester, getAdminClient, parseJsonBody, setCorsHeaders, checkRateLimit, json } = require("../_utils/supabaseAdmin");

// VPS proxy — static IP whitelisted with PRA
const VPS_PROXY_URL    = process.env.PRA_PROXY_URL;
const VPS_PROXY_SECRET = process.env.PRA_PROXY_SECRET;

const PRA_PRODUCTION_URL = "https://ims.pral.com.pk/ims/production/api/Live/PostData";
const PRA_SANDBOX_URL    = "https://ims.pral.com.pk/ims/sandbox/api/Live/PostData";

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const limit = checkRateLimit(req, 60, 60_000); // 60 invoices per minute per IP
  if (!limit.allowed) return json(res, 429, { error: `Too many requests. Retry after ${limit.retryAfter}s` });

  try {
    // Authenticate — must be a logged-in employee of the business
    const ctx = await getRequester(req);
    if (ctx.error) return json(res, 401, { error: ctx.error });

    const body = await parseJsonBody(req);
    const { invoiceData, environment } = body;

    if (!invoiceData) return json(res, 400, { error: "Missing invoiceData" });

    // ✅ Read PRA token server-side from the settings table using service role key.
    // Never accept praToken from the browser — it could be tampered or exposed in DevTools.
    const supabaseAdmin = await getAdminClient();
    const { data: settingsRow, error: settingsError } = await supabaseAdmin
      .from("settings")
      .select("data")
      .eq("business_id", ctx.requester.business_id)
      .maybeSingle();

    if (settingsError) return json(res, 500, { error: "Failed to load business settings" });

    const praToken = settingsRow?.data?.pra_token;
    const praApiType = environment || settingsRow?.data?.pra_api_type || "sandbox";

    if (!praToken) return json(res, 400, { error: "PRA token not configured for this business. Set it in Settings." });

    let praResult;

    if (VPS_PROXY_URL && VPS_PROXY_SECRET) {
      // ── Route through VPS (static IP) for production whitelisting ──
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
