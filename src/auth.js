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
    return "No employee record found for this account in `employees`. Insert a row with auth_uid = your Supabase Auth user id.";
  }

  return message || "Failed to load employee profile from employees table.";
};

export const getEmployeeByAuthUid = async (authUid) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error(notConfiguredResult.error) };

  const query = supabase
    .from("employees")
    .select("id, auth_uid, business_id, name, email, role, created_at")
    .eq("auth_uid", authUid)
    .single();

  const { data, error } = await withTimeout(query, 15000, "Employee lookup");

  return { data, error };
};

export const loginEmployee = async (email, password) => {
  if (!isSupabaseConfigured) return notConfiguredResult;

  const signIn = supabase.auth.signInWithPassword({ email, password });
  const { data, error } = await withTimeout(signIn, 15000, "Sign in");
  if (error) return { success: false, error: error.message };

  const authUid = data?.user?.id;
  if (!authUid) return { success: false, error: "Login succeeded but no user id returned." };

  const profile = await getEmployeeByAuthUid(authUid);
  if (profile.error) {
    return {
      success: false,
      error: formatEmployeeLookupError(profile.error),
    };
  }

  if (!profile.data) {
    return {
      success: false,
      error:
        "Logged in, but no employee profile was returned. Ensure `employees.auth_uid` matches this user's id.",
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
