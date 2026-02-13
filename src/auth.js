import { supabase, isSupabaseConfigured } from "./supabaseClient";

const notConfiguredResult = {
  success: false,
  error: "Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.",
};

export const getEmployeeByAuthUid = async (authUid) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error(notConfiguredResult.error) };

  const { data, error } = await supabase
    .from("employees")
    .select("id, auth_uid, business_id, name, email, role, created_at")
    .eq("auth_uid", authUid)
    .single();

  return { data, error };
};

export const loginEmployee = async (email, password) => {
  if (!isSupabaseConfigured) return notConfiguredResult;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };

  const authUid = data?.user?.id;
  if (!authUid) return { success: false, error: "Login succeeded but no user id returned." };

  const profile = await getEmployeeByAuthUid(authUid);
  if (profile.error) {
    return {
      success: false,
      error:
        profile.error.message ||
        "Logged in, but failed to load employee profile from employees table.",
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

