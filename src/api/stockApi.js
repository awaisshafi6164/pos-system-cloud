import { supabase } from "../supabaseClient";

// updates: [{ itemCode: string, quantity: number }]
// quantity > 0 => subtract from stock
// quantity < 0 => add back to stock
export const applyMenuStockUpdates = async (updates) => {
  if (!Array.isArray(updates) || updates.length === 0) return { success: true };

  const payload = updates.map((u) => ({
    item_code: String(u.itemCode || "").trim(),
    quantity: Number(u.quantity || 0),
  }));

  const { data, error } = await supabase.rpc("apply_menu_stock_updates", { updates: payload });
  if (error) {
    throw new Error(
      error.message ||
        "Stock update failed. Ensure the `apply_menu_stock_updates` function exists in Supabase."
    );
  }

  return { success: true, data };
};

