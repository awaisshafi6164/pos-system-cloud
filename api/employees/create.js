const { getRequester, requireAdminRole, parseJsonBody, json } = require("../_utils/supabaseAdmin");

const findAuthUserByEmail = async (supabaseAdmin, email) => {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;
  if (!supabaseAdmin.auth?.admin?.listUsers) return null;

  // Supabase doesn't provide a direct "get user by email" in all environments,
  // so we paginate through users. Keep a hard cap to avoid long scans.
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const match = users.find((u) => String(u.email || "").trim().toLowerCase() === normalized);
    if (match) return match;

    if (users.length < perPage) break;
  }

  return null;
};

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

    let authUid = null;
    let successMessage = "Employee created. An invite email was sent to set a password.";

    const existing = await findAuthUserByEmail(ctx.supabaseAdmin, email);
    if (existing?.id) {
      authUid = existing.id;
      successMessage = "Employee membership added for an existing user (no invite sent).";
    } else {
      if (!ctx.supabaseAdmin.auth?.admin?.inviteUserByEmail) {
        return json(res, 500, {
          error:
            "Supabase admin invite is unavailable. Update @supabase/supabase-js or create the user via Admin API.",
        });
      }

      const invite = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email);
      if (invite.error) return json(res, 400, { error: invite.error.message });

      authUid = invite.data?.user?.id;
      if (!authUid) return json(res, 500, { error: "Invite succeeded but no user id returned." });
    }

    // Pre-check duplicates so we can return accurate messages even if the database
    // constraint name differs from what we expect.
    const { data: existingByEmail, error: existingByEmailError } = await ctx.supabaseAdmin
      .from("employees")
      .select("id")
      .eq("business_id", ctx.requester.business_id)
      .eq("email", email)
      .limit(1);

    if (!existingByEmailError && Array.isArray(existingByEmail) && existingByEmail.length > 0) {
      return json(res, 409, { error: "An employee with this email already exists for this business." });
    }

    const { data: existingByAuth, error: existingByAuthError } = await ctx.supabaseAdmin
      .from("employees")
      .select("id")
      .eq("business_id", ctx.requester.business_id)
      .eq("auth_uid", authUid)
      .limit(1);

    if (!existingByAuthError && Array.isArray(existingByAuth) && existingByAuth.length > 0) {
      return json(res, 409, { error: "This user is already linked to this business." });
    }

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

    if (insertError) {
      if (insertError.code === "23505") {
        return json(res, 409, {
          error:
            "Duplicate employee (unique constraint). This usually means you still have a global unique constraint on `employees.email`, or this user/email is already linked to this business.",
          details: insertError.message,
          code: insertError.code,
        });
      }
      return json(res, 400, { error: insertError.message });
    }

    return json(res, 200, {
      data: employee,
      message: successMessage,
    });
  } catch (err) {
    return json(res, 500, { error: err?.message || "Server error" });
  }
};
