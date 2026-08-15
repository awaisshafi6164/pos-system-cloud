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

// ✅ #7 — CORS headers on all serverless functions
const setCorsHeaders = (res) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Business-Id");
};

// ✅ #6 — Body size limit to prevent OOM from large payloads
const MAX_BODY_BYTES = 1_000_000; // 1 MB

const parseJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  let totalSize = 0;
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_BYTES) {
      throw new Error("Payload too large (max 1 MB)");
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

// ✅ #8 — In-memory rate limiter (no external dependency needed)
// Tracks request counts per IP per minute window
const _rateLimitStore = new Map();

const checkRateLimit = (req, maxRequests = 20, windowMs = 60_000) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  const entry = _rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > windowMs) {
    _rateLimitStore.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000) };
  }

  return { allowed: true };
};

// Stricter rate limit specifically for the invite/create endpoint (10 per 5 min)
const checkInviteRateLimit = (req) => checkRateLimit(req, 10, 5 * 60_000);

let _adminClient = null;

const getAdminClient = async () => {
  if (_adminClient) return _adminClient;

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const { createClient } = await import("@supabase/supabase-js");
  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });
  return _adminClient;
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

  const businessId = getBusinessIdHeader(req);
  if (!businessId) return { error: "Missing X-Business-Id header." };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return { error: error.message || "Invalid auth token" };

  const authUid = data?.user?.id;
  if (!authUid) return { error: "No user found for token" };

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
  setCorsHeaders,
  checkRateLimit,
  checkInviteRateLimit,
  json,
};
