/**
 * Shared API response unwrapping utilities.
 * Normalizes the 5 different response patterns used across the codebase.
 */

/**
 * Unwrap an API response that may be:
 * - Direct array: [item1, item2]
 * - Wrapped: { data: [item1, item2] }
 * - Paginated: { data: { data: [...], pagination: {...} } }
 *
 * Returns a clean array.
 */
export function unwrapArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;

  const data = (response as Record<string, unknown>)?.data;
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object' && 'data' in data) {
    const nested = (data as Record<string, unknown>).data;
    if (Array.isArray(nested)) return nested;
  }

  return [];
}

/**
 * Unwrap an API response that may be:
 * - Direct object: { field: value }
 * - Wrapped: { data: { field: value } }
 * - Double-wrapped: { data: { data: { field: value } } }
 *
 * Returns the unwrapped object or a fallback.
 */
export function unwrapResponse<T>(response: unknown, fallback: T): T {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    // Check if it's a wrapper with 'data' key
    const data = (response as Record<string, unknown>).data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Check for double-wrapping
      const nested = (data as Record<string, unknown>).data;
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        return nested as T;
      }
      return data as T;
    }
    return response as T;
  }

  return fallback;
}

/**
 * Unwrap a paginated API response.
 * Returns { data: T[], pagination: {...} }
 */
export function unwrapPaginated<T>(response: unknown): { data: T[]; pagination?: Record<string, unknown> } {
  const result = unwrapResponse(response, {} as Record<string, unknown>) as Record<string, unknown>;

  return {
    data: unwrapArray<T>(result?.data ?? result),
    pagination: (result?.pagination as Record<string, unknown>) ?? undefined,
  };
}
