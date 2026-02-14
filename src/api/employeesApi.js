import { supabase } from "../supabaseClient";
import employeeManager from "../utils/EmployeeManager";

const getAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data?.session?.access_token;
  if (!token) throw new Error("Not authenticated.");
  return token;
};

const request = async (path, { method = "GET", body } = {}) => {
  const token = await getAccessToken();
  const businessId = employeeManager.getField("business_id");
  if (!businessId) throw new Error("Missing business id. Please log in again.");
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Business-Id": businessId,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
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
