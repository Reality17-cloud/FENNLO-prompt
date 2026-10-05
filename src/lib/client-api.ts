export async function api(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(75_000),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "The connection was interrupted. Your saved thread is available after refresh.",
    );
  }
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    window.location.assign("/signin");
    throw new Error("Sign in to continue.");
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error(
      "Fennlo returned an unreadable response. Refresh and try again.",
    );
  }
  if (!response.ok) {
    const v = value as { error?: unknown; code?: unknown };
    const codes = [
      "AUTH_REQUIRED",
      "AUTH_INVALID",
      "ACCOUNT_UNAVAILABLE",
      "RATE_LIMITED",
      "NOT_FOUND",
      "CONFLICT",
      "THREAD_CLOSED",
      "INVALID_ACTION",
      "DELETE_CONFIRMATION",
      "APP_NOT_CONFIGURED",
      "AI_NOT_CONFIGURED",
      "AI_TIMEOUT",
      "AI_UNAVAILABLE",
      "AI_INVALID_RESPONSE",
      "AI_RESPONSE_LIMIT",
      "INVALID_BODY",
      "INVALID_INPUT",
      "BODY_TOO_LARGE",
      "BODY_TIMEOUT",
      "UNSUPPORTED_MEDIA",
      "CROSS_ORIGIN",
      "INTERNAL_ERROR",
    ];
    throw new Error(
      typeof v?.error === "string" &&
        typeof v.code === "string" &&
        codes.includes(v.code) &&
        v.error.length <= 300
        ? v.error
        : "Fennlo couldn't complete this request. Please try again.",
    );
  }
  return value;
}
