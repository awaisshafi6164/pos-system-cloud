# Menu Cache with LocalStorage

## Overview
Cache menu items in browser localStorage to eliminate redundant API calls on the Menu and POS screens. A manual "Sync" button allows users to refresh data on-demand.

## Important Notes
- **DO NOT commit or push to main.** The main branch is in production release. All development is local-only until the feature is fully verified by the developer, who will commit manually.

## Requirements
1. On page load (Menu screen & POS screen), read menu data from localStorage cache — no API call if cache exists.
2. If cache is empty (first visit or cleared), fetch from API and populate cache.
3. A visible **Sync** button on the Menu screen that:
   - Fetches fresh menu data from Supabase API
   - Updates localStorage cache
   - Shows a toast confirmation "Menu synced!"
4. Auto-invalidate/update cache when add/edit/delete operations succeed on the Menu screen (no manual sync needed after local changes).
5. POS screen also reads from cache for instant load.
6. Cache is keyed by `business_id` to support multi-tenant isolation.
7. Cache stores: `{ items: [...], lastSynced: <ISO timestamp> }`

## Technical Design
- New utility: `src/utils/menuCache.js` — handles get/set/clear cache operations.
- Modified: `src/api/menuItemsApi.js` — add cached version of `listMenuItems`.
- Modified: `src/menu.js` — use cache on load, add Sync button, update cache on CRUD.
- Modified: `src/pos.js` — use cache on load.

## Cache Key Format
```
pos_menu_cache_{business_id}
```

## No Expiry
Cache does not auto-expire. The Sync button is the manual refresh mechanism. Cache is also updated automatically after any local CRUD operation.
