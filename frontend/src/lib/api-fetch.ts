/**
 * Client-side fetch wrapper with automatic 401 retry.
 * When a request returns 401, calls /api/auth/refresh once, then retries.
 * Uses a mutex so concurrent 401s only trigger one refresh.
 */

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

interface ApiFetchOptions extends RequestInit {
  /** Skip 401 retry (use for auth routes to avoid infinite loops) */
  skipRetry?: boolean;
}

export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { skipRetry, ...fetchOptions } = options;

  const res = await fetch(url, fetchOptions);

  if (res.status === 401 && !skipRetry) {
    // Deduplicate concurrent refreshes
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      // Retry original request once
      return fetch(url, fetchOptions);
    }
  }

  return res;
}

/** GET helper */
export function apiGet(url: string, options?: ApiFetchOptions) {
  return apiFetch(url, { method: "GET", ...options });
}

/** POST helper with JSON body */
export function apiPost(
  url: string,
  body?: unknown,
  options?: ApiFetchOptions,
) {
  return apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
    ...options,
  });
}

/** PATCH helper with JSON body */
export function apiPatch(
  url: string,
  body?: unknown,
  options?: ApiFetchOptions,
) {
  return apiFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
    ...options,
  });
}

/** DELETE helper */
export function apiDelete(url: string, options?: ApiFetchOptions) {
  return apiFetch(url, { method: "DELETE", ...options });
}
