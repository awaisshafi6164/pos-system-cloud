/**
 * Retries an async function up to `retries` times with exponential backoff.
 * Suitable for read operations (menu, settings, invoice list) on unreliable Wi-Fi.
 * Do NOT use for writes — use idempotency keys for those instead.
 *
 * @param {Function} fn - Async function to retry
 * @param {number} retries - Max retry attempts (default 2)
 * @param {number} delayMs - Base delay in ms, doubles each attempt (default 400)
 */
export const withRetry = async (fn, retries = 2, delayMs = 400) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
};
