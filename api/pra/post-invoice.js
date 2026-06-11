const { getRequester, parseJsonBody, json } = require("../_utils/supabaseAdmin");

// VPS proxy — static IP whitelisted with PRA
// Falls back to direct PRA call if VPS URL is not configured (sandbox/dev)
const VPS_PROXY_URL    = process.env.PRA_PROXY_URL;    // e.g. http://140.245.204.153:3001/api/pra/post-invoice
const VPS_PROXY_SECRET = process.env.PRA_PROXY_SECRET; // e.g. pra-secret-2026

const PRA_PRODUCTION_URL = "https://ims.pral.com.pk/ims/production/api/Live/PostData";
const PRA_SANDBOX_URL    = "https://ims.pral.com.pk/ims/sandbox/api/Live/PostData";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    // Authenticate — must be a logged-in employee of the business
    const ctx = await getRequester(req);
    if (ctx.error) return json(res, 401, { error: ctx.error });

    const body = await parseJsonBody(req);
    const { invoiceData, praToken, environment } = body;

    if (!invoiceData) return json(res, 400, { error: "Missing invoiceData" });
    if (!praToken)    return json(res, 400, { error: "Missing praToken" });

    let praResult;

    if (VPS_PROXY_URL && VPS_PROXY_SECRET) {
      // ── Route through VPS (static IP) for production whitelisting ──
      console.log(`[pra/post-invoice] Forwarding via VPS proxy (${environment}):`, VPS_PROXY_URL);

      const vpsResponse = await fetch(VPS_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Proxy-Secret": VPS_PROXY_SECRET,
        },
        body: JSON.stringify({ invoiceData, praToken, environment }),
      });

      praResult = await vpsResponse.json();
    } else {
      // ── Direct call (sandbox / local dev without VPS configured) ──
      const praURL = environment === "production" ? PRA_PRODUCTION_URL : PRA_SANDBOX_URL;
      console.log(`[pra/post-invoice] Direct call to PRA (${environment}):`, praURL);

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

    console.log("[pra/post-invoice] PRA result:", JSON.stringify(praResult));
    return json(res, 200, praResult);

  } catch (err) {
    console.error("[pra/post-invoice] Error:", err.message);
    return json(res, 500, { error: err.message || "Internal server error" });
  }
};
