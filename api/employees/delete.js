const { getRequester, requireAdminRole, parseJsonBody, json } = require("../_utils/supabaseAdmin");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "DELETE" && req.method !== "POST") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const ctx = await getRequester(req);
    if (ctx.error) return json(res, 401, { error: ctx.error });

    const adminCheck = requireAdminRole(ctx.requester);
    if (adminCheck.error) return json(res, 403, { error: adminCheck.error });

    const body = await parseJsonBody(req);
    const id = body.id;
    if (!id) return json(res, 400, { error: "id is required" });

    const { data: target, error: targetError } = await ctx.supabaseAdmin
      .from("employees")
      .select("id, auth_uid, business_id")
      .eq("id", id)
      .eq("business_id", ctx.requester.business_id)
      .single();

    if (targetError) return json(res, 404, { error: "Employee not found" });

    if (target.auth_uid && target.auth_uid === ctx.requester.auth_uid) {
      return json(res, 400, { error: "You cannot delete your own employee account." });
    }

    const { error: deleteRowError } = await ctx.supabaseAdmin
      .from("employees")
      .delete()
      .eq("id", id)
      .eq("business_id", ctx.requester.business_id);

    if (deleteRowError) return json(res, 400, { error: deleteRowError.message });

    if (target.auth_uid && ctx.supabaseAdmin.auth?.admin?.deleteUser) {
      const { error: deleteUserError } = await ctx.supabaseAdmin.auth.admin.deleteUser(target.auth_uid);
      if (deleteUserError) {
        return json(res, 200, {
          message: "Employee row deleted, but auth user deletion failed.",
          warning: deleteUserError.message,
        });
      }
    }

    return json(res, 200, { message: "Employee deleted." });
  } catch (err) {
    return json(res, 500, { error: err?.message || "Server error" });
  }
};

