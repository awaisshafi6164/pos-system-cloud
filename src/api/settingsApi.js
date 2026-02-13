import { supabase } from "../supabaseClient";

export const getBusinessSettings = async (businessId) => {
  if (!businessId) throw new Error("Missing businessId");

  const { data, error } = await supabase
    .from("settings")
    .select("business_id, data")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.data || null;
};

export const upsertBusinessSettings = async (businessId, settings) => {
  if (!businessId) throw new Error("Missing businessId");

  const payload = {
    business_id: businessId,
    data: settings || {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("settings")
    .upsert(payload, { onConflict: "business_id" })
    .select("data")
    .single();

  if (error) throw new Error(error.message);
  return data?.data || null;
};

