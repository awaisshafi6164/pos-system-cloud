import { supabase } from "../supabaseClient";

export const getNextUsin = async () => {
  // Use a "peek" function so refreshing / React StrictMode doesn't consume numbers.
  // SQL function to create: `peek_next_usin()`.
  const { data, error } = await supabase.rpc("peek_next_usin");
  if (error) throw new Error(error.message);
  // eslint-disable-next-line no-console
  console.debug("[invoice] peek_next_usin:", data);
  return data; // function returns text
};
