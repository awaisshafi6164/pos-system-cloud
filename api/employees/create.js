const { getRequester, requireAdminRole, parseJsonBody, json } = require("../_utils/supabaseAdmin");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const ctx = await getRequester(req);
    if (ctx.error) return json(res, 401, { error: ctx.error });

    const adminCheck = requireAdminRole(ctx.requester);
    if (adminCheck.error) return json(res, 403, { error: adminCheck.error });

    const body = await parseJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const role = String(body.role || "").trim();

    if (!email) return json(res, 400, { error: "email is required" });
    if (!name) return json(res, 400, { error: "name is required" });
    if (!role) return json(res, 400, { error: "role is required" });

    if (!ctx.supabaseAdmin.auth?.admin?.inviteUserByEmail) {
      return json(res, 500, {
        error:
          "Supabase admin invite is unavailable. Update @supabase/supabase-js or create a server-side invite using Supabase Admin API.",
      });
    }

    const invite = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email);
    if (invite.error) return json(res, 400, { error: invite.error.message });

    const authUid = invite.data?.user?.id;
    if (!authUid) return json(res, 500, { error: "Invite succeeded but no user id returned." });

    const { data: employee, error: insertError } = await ctx.supabaseAdmin
      .from("employees")
      .insert([
        {
          auth_uid: authUid,
          business_id: ctx.requester.business_id,
          name,
          email,
          role,
        },
      ])
      .select("id, auth_uid, business_id, name, email, role, created_at")
      .single();

    if (insertError) return json(res, 400, { error: insertError.message });

    return json(res, 200, {
      data: employee,
      message: "Employee created. An invite email was sent to set a password.",
    });
  } catch (err) {
    return json(res, 500, { error: err?.message || "Server error" });
  }
};

