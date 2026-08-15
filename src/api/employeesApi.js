import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";

// ✅ Gets the access token. Uses getSession() which reads from memory — fast.
// Retries once with a short wait to handle the rare case where the session
// hasn't fully hydrated from storage on first render.
const getAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  let token = data?.session?.access_token;

  if (!token) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const retry = await supabase.auth.getSession();
    token = retry.data?.session?.access_token;
  }

  if (!token) throw new Error("Not authenticated. Please log in again.");
  return token;
};

const request = async (path, { method = "GET", body } = {}) => {
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business id. Please log in again.");

  const token = await getAccessToken();

  const doFetch = (t) =>
    fetch(path, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${t}`,
        "X-Business-Id": businessId,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch(token);

  // ✅ Only retry on 401 (expired token) — 403 means wrong role, refreshing won't help
  if (res.status === 401) {
    await supabase.auth.refreshSession();
    const freshToken = await getAccessToken();
    res = await doFetch(freshToken);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json;
};

export const listEmployees = async () => {
  const json = await request("/api/employees/list");
  return json.data || [];
};

export const createEmployee = async ({ name, email, role }) => {
  const json = await request("/api/employees/create", { method: "POST", body: { name, email, role } });
  return json;
};

export const updateEmployee = async ({ id, name, role }) => {
  const json = await request("/api/employees/update", { method: "PATCH", body: { id, name, role } });
  return json.data;
};

export const deleteEmployee = async (id) => {
  const json = await request("/api/employees/delete", { method: "DELETE", body: { id } });
  return json;
};
