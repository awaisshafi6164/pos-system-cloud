const { getRequester, requireAdminRole, parseJsonBody, setCorsHeaders, checkInviteRateLimit, json } = require("../_utils/supabaseAdmin");

// ✅ Use admin getUserByEmail — single direct lookup instead of paginating all users
const findAuthUserByEmail = async (supabaseAdmin, email) => {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(normalized);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
};

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return json(res, 204, {});

  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    // ✅ Stricter rate limit on invite endpoint — 10 invites per 5 minutes per IP
    const limit = checkInviteRateLimit(req);
    if (!limit.allowed) return json(res, 429, { error: `Too many requests. Retry after ${limit.retryAfter}s` });

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

    // ✅ Whitelist valid roles — prevents arbitrary role strings
    const VALID_ROLES = ["admin", "cashier", "manager", "receptionist"];
    if (!VALID_ROLES.includes(role)) {
      return json(res, 400, { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` });
    }

    // ✅ Basic input length validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return json(res, 400, { error: "Invalid email format" });
    if (name.length > 100) return json(res, 400, { error: "Name too long (max 100 chars)" });
    if (email.length > 200) return json(res, 400, { error: "Email too long (max 200 chars)" });

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

      // redirectTo tells Supabase where to send the user after they click the invite link.
      // This must match a URL in your Supabase Dashboard > Auth > URL Configuration > Redirect URLs.
      const siteUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.SITE_URL || "http://localhost:3000";
      const invite = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      });
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
