import { supabase, isSupabaseConfigured } from "./supabaseClient";

const notConfiguredResult = {
  success: false,
  error: "Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.",
};

const withTimeout = async (promise, ms, label) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const formatEmployeeLookupError = (error) => {
  const details = error?.details || "";
  const message = error?.message || "";
  const combined = `${message} ${details}`.trim();

  if (/0 rows/i.test(combined) || /multiple \(or no\) rows/i.test(combined)) {
    return "No employee membership found for this account and business code. Ensure there is an `employees` row with matching auth_uid + business_id.";
  }

  return message || "Failed to load employee profile from employees table.";
};

export const getBusinessByCode = async (businessCode) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error(notConfiguredResult.error) };

  const code = String(businessCode || "").trim();
  if (!code) return { data: null, error: new Error("Business code is required.") };

  try {
    const query = supabase.from("businesses").select("id, code, name").ilike("code", code).single();
    const { data, error } = await withTimeout(query, 15000, "Business lookup");
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

export const getEmployeeMembership = async ({ authUid, businessId }) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error(notConfiguredResult.error) };

  try {
    const query = supabase
      .from("employees")
      .select("id, auth_uid, business_id, name, email, role, created_at")
      .eq("auth_uid", authUid)
      .eq("business_id", businessId)
      .single();

    const { data, error } = await withTimeout(query, 15000, "Employee lookup");
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

export const loginEmployee = async (email, password, businessCode) => {
  if (!isSupabaseConfigured) return notConfiguredResult;

  let data;
  try {
    const signIn = supabase.auth.signInWithPassword({ email, password });
    const result = await withTimeout(signIn, 15000, "Sign in");
    data = result?.data;
    const error = result?.error;
    if (error) return { success: false, error: error.message };
  } catch (err) {
    return { success: false, error: err?.message || "Sign in failed." };
  }

  const authUid = data?.user?.id;
  if (!authUid) return { success: false, error: "Login succeeded but no user id returned." };

  const business = await getBusinessByCode(businessCode);
  if (business.error || !business.data?.id) {
    return { success: false, error: business.error?.message || "Invalid business code." };
  }

  const profile = await getEmployeeMembership({ authUid, businessId: business.data.id });
  if (profile?.error) {
    return {
      success: false,
      error: formatEmployeeLookupError(profile.error),
    };
  }

  if (!profile?.data) {
    return {
      success: false,
      error:
        "Logged in, but no employee membership was returned. Ensure `employees.auth_uid` matches this user's id and business_id matches the entered business code.",
    };
  }

  return { success: true, user: profile.data, session: data.session };
};

export const signupEmployee = async ({ email, password, name, businessId, role }) => {
  if (!isSupabaseConfigured) return notConfiguredResult;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { success: false, error: error.message };

  const authUid = data?.user?.id;
  if (!authUid) {
    return {
      success: false,
      error:
        "Sign up created the auth user, but no user id was returned (email confirmation may be required).",
    };
  }

  const { data: employee, error: insertError } = await supabase
    .from("employees")
    .insert([
      {
        auth_uid: authUid,
        email,
        name,
        business_id: businessId,
        role,
      },
    ])
    .select("id, auth_uid, business_id, name, email, role, created_at")
    .single();

  if (insertError) return { success: false, error: insertError.message };

  return { success: true, user: employee };
};

export const logoutEmployee = async () => {
  if (!isSupabaseConfigured) return notConfiguredResult;
  const { error } = await supabase.auth.signOut();
  if (error) return { success: false, error: error.message };
  return { success: true };
};
