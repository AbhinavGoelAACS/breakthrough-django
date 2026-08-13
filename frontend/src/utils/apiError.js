/**
 * Turn an axios error into something a person can act on.
 *
 * The rule this exists to enforce: a failed request is not an empty result.
 * Pages must be able to tell "there are no books" from "we could not reach the
 * server", because the fix is completely different for the reader.
 */

/** True when the request never got a reply — offline, DNS, CORS, timeout. */
export const isNetworkError = (err) => Boolean(err) && !err.response;

/** True when the resource genuinely does not exist. */
export const isNotFound = (err) => err?.response?.status === 404;

/**
 * A single sentence explaining what went wrong and what to do about it.
 * `fallback` covers the case where the server sent a message we can use.
 */
export const describeApiError = (err, fallback = 'Something went wrong.') => {
  if (!err) return fallback;

  if (isNetworkError(err)) {
    if (err.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Check your connection and try again.';
    }
    return 'We could not reach the server. Check your connection and try again.';
  }

  const { status, data } = err.response;

  // The server's own message is usually the most specific thing available.
  const detail = typeof data === 'string' ? data : data?.detail;

  switch (status) {
    case 400:
      return detail || 'Some of the details sent were not valid.';
    case 401:
      return 'Your session has expired. Sign in again to continue.';
    case 403:
      return detail || 'You do not have permission to do that.';
    case 404:
      return detail || 'We could not find that.';
    case 413:
      return 'That file is too large to upload.';
    case 429:
      return 'You have made too many requests. Wait a little while and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The server had a problem. This is on our side — try again shortly.';
    default:
      return detail || fallback;
  }
};

/**
 * Field-keyed errors from a DRF serializer, flattened to {field: 'message'}.
 * Returns null when the response was not a field-level validation error, so
 * callers can fall back to describeApiError().
 */
export const fieldErrors = (err) => {
  const data = err?.response?.data;
  if (err?.response?.status !== 400) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (data.detail) return null;

  const entries = Object.entries(data).map(([key, value]) => [
    key,
    Array.isArray(value) ? String(value[0]) : String(value),
  ]);
  return entries.length ? Object.fromEntries(entries) : null;
};
