const getEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
};

const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header) return null;
  const [scheme, token] = String(header).split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

const json = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const parseJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const getAdminClient = async () => {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const getBusinessIdHeader = (req) => {
  const raw =
    req.headers?.["x-business-id"] ||
    req.headers?.["X-Business-Id"] ||
    req.headers?.["x-business-id".toLowerCase()];
  return raw ? String(raw).trim() : null;
};

const getRequester = async (req) => {
  const token = getBearerToken(req);
  if (!token) return { error: "Missing Authorization: Bearer <access_token>" };

  const supabaseAdmin = await getAdminClient();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return { error: error.message || "Invalid auth token" };

  const authUid = data?.user?.id;
  if (!authUid) return { error: "No user found for token" };

  const businessId = getBusinessIdHeader(req);
  if (!businessId) {
    return { error: "Missing X-Business-Id header." };
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from("employees")
    .select("id, auth_uid, business_id, email, name, role")
    .eq("auth_uid", authUid)
    .eq("business_id", businessId)
    .single();

  if (employeeError) {
    return { error: "Requester is not linked to an employee record in `employees`." };
  }

  return { supabaseAdmin, requester: employee, token };
};

const requireAdminRole = (requester) => {
  if (!requester) return { error: "Missing requester" };
  if (requester.role !== "admin") return { error: "Forbidden (admin only)" };
  return { ok: true };
};

module.exports = {
  getAdminClient,
  getRequester,
  requireAdminRole,
  parseJsonBody,
  json,
};
