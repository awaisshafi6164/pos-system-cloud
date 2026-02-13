const { getRequester, requireAdminRole, json } = require("../_utils/supabaseAdmin");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

    const ctx = await getRequester(req);
    if (ctx.error) return json(res, 401, { error: ctx.error });

    const adminCheck = requireAdminRole(ctx.requester);
    if (adminCheck.error) return json(res, 403, { error: adminCheck.error });

    const { data, error } = await ctx.supabaseAdmin
      .from("employees")
      .select("id, auth_uid, business_id, name, email, role, created_at")
      .eq("business_id", ctx.requester.business_id)
      .order("created_at", { ascending: false });

    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { data });
  } catch (err) {
    return json(res, 500, { error: err?.message || "Server error" });
  }
};

