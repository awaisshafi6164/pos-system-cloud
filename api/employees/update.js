const { getRequester, requireAdminRole, parseJsonBody, setCorsHeaders, checkRateLimit, json } = require("../_utils/supabaseAdmin");

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return json(res, 204, {});

  try {
    if (req.method !== "PATCH" && req.method !== "POST") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const limit = checkRateLimit(req);
    if (!limit.allowed) return json(res, 429, { error: `Too many requests. Retry after ${limit.retryAfter}s` });

    const ctx = await getRequester(req);
    if (ctx.error) return json(res, 401, { error: ctx.error });

    const adminCheck = requireAdminRole(ctx.requester);
    if (adminCheck.error) return json(res, 403, { error: adminCheck.error });

    const body = await parseJsonBody(req);
    const id = body.id;
    const name = String(body.name || "").trim();
    const role = String(body.role || "").trim();

    if (!id) return json(res, 400, { error: "id is required" });
    if (!name) return json(res, 400, { error: "name is required" });
    if (!role) return json(res, 400, { error: "role is required" });

    // ✅ Whitelist valid roles
    const VALID_ROLES = ["admin", "cashier", "manager", "receptionist"];
    if (!VALID_ROLES.includes(role)) {
      return json(res, 400, { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` });
    }
    if (name.length > 100) return json(res, 400, { error: "Name too long (max 100 chars)" });

    const { data: employee, error } = await ctx.supabaseAdmin
      .from("employees")
      .update({ name, role })
      .eq("id", id)
      .eq("business_id", ctx.requester.business_id)
      .select("id, auth_uid, business_id, name, email, role, created_at")
      .single();

    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { data: employee });
  } catch (err) {
    return json(res, 500, { error: err?.message || "Server error" });
  }
};

