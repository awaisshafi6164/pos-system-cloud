/**
 * Menu Cache Utility
 * Stores menu items in localStorage keyed by business_id.
 * Cache format: { items: [...], lastSynced: ISO string }
 */

const CACHE_PREFIX = "pos_menu_cache_";

const getCacheKey = (businessId) => `${CACHE_PREFIX}${businessId}`;

/**
 * Get cached menu items for a business.
 * Returns { items, lastSynced } or null if no cache.
 */
export const getMenuCache = (businessId) => {
  try {
    const raw = localStorage.getItem(getCacheKey(businessId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Save menu items to cache.
 */
export const setMenuCache = (businessId, items) => {
  try {
    const payload = {
      items: items || [],
      lastSynced: new Date().toISOString(),
    };
    localStorage.setItem(getCacheKey(businessId), JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to write menu cache:", err);
  }
};

/**
 * Clear menu cache for a business.
 */
export const clearMenuCache = (businessId) => {
  try {
    localStorage.removeItem(getCacheKey(businessId));
  } catch {
    // silent
  }
};

/**
 * Get the last synced timestamp (human-readable) or null.
 */
export const getLastSyncedTime = (businessId) => {
  const cache = getMenuCache(businessId);
  return cache?.lastSynced || null;
};
